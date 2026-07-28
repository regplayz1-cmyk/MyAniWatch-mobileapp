import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import {
  apiGetAllStreamSources,
  apiSaveWatchedProgress,
  apiGetEpisodes,
  apiGetComments,
  apiPostComment,
} from "../services/api";
import {
  ChevronLeft,
  ChevronRight,
  Server,
  AlertCircle,
  Play,
  Send,
  MessageCircle,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function WatchScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { animeId, episode = 1, title = "Anime", malId } = route.params || {};

  const [currentEp, setCurrentEp] = useState(Number(episode));
  const [sources, setSources] = useState<Array<{ name: string; url: string; type: "hls" | "iframe" }>>([]);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const epScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadStreamSources();
    loadComments();
  }, [animeId, currentEp]);

  useEffect(() => {
    loadEpisodes();
  }, [animeId]);

  const loadEpisodes = async () => {
    try {
      const res = await apiGetEpisodes(String(animeId));
      if (res?.data?.episodes && res.data.episodes.length > 0) {
        setEpisodes(res.data.episodes);
      } else if (res?.data?.totalEpisodes) {
        const count = res.data.totalEpisodes;
        setEpisodes(Array.from({ length: count }, (_, i) => ({ number: i + 1, title: `Episode ${i + 1}` })));
      } else if (Array.isArray(res?.data) && res.data.length > 0) {
        setEpisodes(res.data);
      } else if (Array.isArray(res) && res.length > 0) {
        setEpisodes(res);
      } else {
        setEpisodes(Array.from({ length: 24 }, (_, i) => ({ number: i + 1, title: `Episode ${i + 1}` })));
      }
    } catch (err) {
      setEpisodes(Array.from({ length: 24 }, (_, i) => ({ number: i + 1, title: `Episode ${i + 1}` })));
    }
  };

  const loadStreamSources = async () => {
    try {
      setLoading(true);
      const resSources = await apiGetAllStreamSources(String(animeId), currentEp, title, malId);
      setSources(resSources);
      setActiveSourceIdx(0);

      // Save watch history
      if (user?.id) {
        apiSaveWatchedProgress({
          userId: user.id,
          animeId: String(animeId),
          animeTitle: title,
          thumbnail: "",
          episodeId: `ep-${currentEp}`,
          episodeNumber: currentEp,
          current: 300,
          duration: 1440,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Stream loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const res = await apiGetComments(String(animeId), currentEp);
      if (res && Array.isArray(res)) {
        setComments(res);
      } else if (res && res.data) {
        setComments(res.data);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      await apiPostComment({
        animeId: String(animeId),
        episode: currentEp,
        content: newComment.trim(),
        authorName: user.username,
        authorAvatar: user.avatar,
      });
      setNewComment("");
      loadComments();
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  // Auto-scroll episodes logic
  useEffect(() => {
    if (episodes.length > 0 && epScrollRef.current) {
      // Find index
      let epIndex = episodes.findIndex((e) => e.number === currentEp);
      if (epIndex === -1) {
        // Fallback for array of numbers or strings
        epIndex = currentEp - 1;
      }
      if (epIndex > -1) {
        // Rough estimation of item width/position (approx 50 width + 8 gap = 58)
        const scrollX = Math.max(0, epIndex * 58 - width / 2 + 25);
        setTimeout(() => {
          epScrollRef.current?.scrollTo({ x: scrollX, animated: true });
        }, 300);
      }
    }
  }, [currentEp, episodes]);

  const activeSource = sources[activeSourceIdx];

  const getPlayerHtml = (sourceUrl: string, type: string) => {
    const fullSourceUrl = sourceUrl.startsWith("http")
      ? sourceUrl
      : `https://myaniwatch-ashen.vercel.app${sourceUrl.startsWith("/") ? "" : "/"}${sourceUrl}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          :root {
            --primary: #8b5cf6;
            --primary-glow: rgba(139, 92, 246, 0.5);
            --accent: #00e5ff;
            --bg: #090a0f;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
          body, html { width: 100%; height: 100%; background: var(--bg); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif; }
          
          #player-container {
            position: relative;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          
          video {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          
          /* Top HUD */
          .hud-top {
            position: absolute;
            top: 0; left: 0; right: 0;
            padding: 14px 18px;
            background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%);
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 10;
            transition: opacity 0.3s ease;
          }
          
          .hud-title {
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.3px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.6);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 70%;
          }
          
          .hud-badge {
            background: linear-gradient(135deg, var(--primary), #7c3aed);
            color: #fff;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 0 12px var(--primary-glow);
          }
          
          /* Center Play Overlay */
          .center-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 8;
            background: rgba(0,0,0,0.3);
            transition: opacity 0.3s ease;
          }
          
          .play-btn-large {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), #7c3aed);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 22px;
            cursor: pointer;
            box-shadow: 0 0 30px var(--primary-glow);
            transition: transform 0.2s ease;
          }
          .play-btn-large:active { transform: scale(0.9); }

          /* Bottom Control Bar */
          .hud-bottom {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            padding: 12px 16px 14px;
            background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%);
            z-index: 10;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: opacity 0.3s ease;
          }

          /* Seek Bar */
          .seek-row {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .seek-bar-container {
            position: relative;
            flex: 1;
            height: 6px;
            background: rgba(255,255,255,0.2);
            border-radius: 3px;
            cursor: pointer;
          }
          .seek-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            border-radius: 3px;
            width: 0%;
          }
          .time-text {
            color: rgba(255,255,255,0.8);
            font-size: 11px;
            font-weight: 600;
            font-family: monospace;
            min-width: 80px;
            text-align: right;
          }

          /* Controls Row */
          .controls-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .controls-left, .controls-right {
            display: flex;
            align-items: center;
            gap: 18px;
          }
          .ctrl-icon {
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            opacity: 0.85;
            transition: opacity 0.2s;
          }
          .ctrl-icon:active { opacity: 1; transform: scale(1.1); }

          /* Hidden UI state */
          .ui-hidden .hud-top, .ui-hidden .hud-bottom, .ui-hidden .center-overlay {
            opacity: 0;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div id="player-container" class="ui-visible">
          <video id="video" playsinline crossorigin="anonymous" autoplay></video>

          <!-- Top HUD -->
          <div class="hud-top">
            <div class="hud-title">${title || "MyAniWatch"} • Episode ${currentEp}</div>
            <div class="hud-badge">HD 1080p</div>
          </div>

          <!-- Center Play Overlay -->
          <div class="center-overlay" id="center-play">
            <div class="play-btn-large" id="big-play-icon">
              <i class="fas fa-play" style="margin-left: 3px;"></i>
            </div>
          </div>

          <!-- Bottom Controls -->
          <div class="hud-bottom">
            <div class="seek-row">
              <div class="seek-bar-container" id="seek-container">
                <div class="seek-fill" id="seek-fill"></div>
              </div>
              <div class="time-text" id="time-text">00:00 / 00:00</div>
            </div>
            <div class="controls-row">
              <div class="controls-left">
                <i class="fas fa-play ctrl-icon" id="btn-play"></i>
                <i class="fas fa-undo ctrl-icon" id="btn-rewind"></i>
                <i class="fas fa-redo ctrl-icon" id="btn-forward"></i>
              </div>
              <div class="controls-right">
                <i class="fas fa-expand ctrl-icon" id="btn-fullscreen"></i>
              </div>
            </div>
          </div>
        </div>

        <script>
          var video = document.getElementById('video');
          var container = document.getElementById('player-container');
          var seekFill = document.getElementById('seek-fill');
          var seekContainer = document.getElementById('seek-container');
          var timeText = document.getElementById('time-text');
          var btnPlay = document.getElementById('btn-play');
          var bigPlayIcon = document.getElementById('big-play-icon');
          var centerPlay = document.getElementById('center-play');
          var btnRewind = document.getElementById('btn-rewind');
          var btnForward = document.getElementById('btn-forward');
          var btnFullscreen = document.getElementById('btn-fullscreen');

          var hideTimer;
          function resetHideTimer() {
            container.classList.remove('ui-hidden');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(function() {
              if (!video.paused) {
                container.classList.add('ui-hidden');
              }
            }, 3500);
          }

          container.addEventListener('click', function(e) {
            if (e.target.closest('.hud-bottom') || e.target.closest('.hud-top')) return;
            resetHideTimer();
          });

          function togglePlay() {
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }

          centerPlay.addEventListener('click', togglePlay);
          btnPlay.addEventListener('click', togglePlay);

          video.addEventListener('play', function() {
            btnPlay.className = 'fas fa-pause ctrl-icon';
            bigPlayIcon.innerHTML = '<i class="fas fa-pause"></i>';
            centerPlay.style.opacity = '0';
            resetHideTimer();
          });

          video.addEventListener('pause', function() {
            btnPlay.className = 'fas fa-play ctrl-icon';
            bigPlayIcon.innerHTML = '<i class="fas fa-play" style="margin-left: 3px;"></i>';
            centerPlay.style.opacity = '1';
            container.classList.remove('ui-hidden');
          });

          function fmtTime(s) {
            if (isNaN(s) || !isFinite(s)) return '00:00';
            s = Math.floor(s);
            var m = Math.floor(s / 60);
            var sec = s % 60;
            return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
          }

          video.addEventListener('timeupdate', function() {
            if (!video.duration) return;
            var pct = (video.currentTime / video.duration) * 100;
            seekFill.style.width = pct + '%';
            timeText.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
          });

          seekContainer.addEventListener('click', function(e) {
            var rect = seekContainer.getBoundingClientRect();
            var pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
          });

          btnRewind.addEventListener('click', function() { video.currentTime = Math.max(0, video.currentTime - 10); });
          btnForward.addEventListener('click', function() { video.currentTime = Math.min(video.duration, video.currentTime + 10); });

          btnFullscreen.addEventListener('click', function() {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              container.requestFullscreen();
            }
          });

          var videoSrc = '${fullSourceUrl}';
          if (Hls.isSupported()) {
            var hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(videoSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
              video.play().catch(function() {});
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoSrc;
            video.addEventListener('loadedmetadata', function() { video.play(); });
          }
        </script>
      </body>
      </html>
    `;
  };

  const playerHtml = activeSource ? getPlayerHtml(activeSource.url, activeSource.type) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent}>
        {/* Video Player Box */}
        <View style={styles.playerContainer}>
          {loading ? (
            <View style={styles.playerLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Fetching Stream Servers (Anizone, AniBD, 2Dhive)...</Text>
            </View>
          ) : activeSource ? (
            <WebView
              key={`${activeSource.url}-${currentEp}`}
              source={
                playerHtml
                  ? { html: playerHtml, baseUrl: "https://myaniwatch-ashen.vercel.app" }
                  : { uri: activeSource.url }
              }
              style={styles.webview}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              mixedContentMode="always"
              userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
          ) : (
            <View style={styles.playerLoader}>
              <AlertCircle size={32} color={COLORS.danger} />
              <Text style={styles.errorText}>No available stream servers found for Episode {currentEp}</Text>
            </View>
          )}
        </View>

        <View style={styles.panelContent}>
          {/* Episode Info */}
          <Text style={styles.episodeInfoTitle}>Episode {currentEp}</Text>

          {/* Episode Nav Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.navEpBtn, currentEp <= 1 && styles.disabledBtn]}
              disabled={currentEp <= 1}
              onPress={() => setCurrentEp((e) => Math.max(1, e - 1))}
            >
              <ChevronLeft size={16} color={COLORS.text} />
              <Text style={styles.navEpText}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.epBadge}>
              <Play size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.epBadgeText}>EPISODE {currentEp}</Text>
            </View>

            <TouchableOpacity
              style={styles.navEpBtn}
              onPress={() => setCurrentEp((e) => e + 1)}
            >
              <Text style={styles.navEpText}>Next</Text>
              <ChevronRight size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Server Selector Tabs */}
          {sources.length > 0 && (
            <View style={styles.serverSection}>
              <View style={styles.serverTitleRow}>
                <Server size={16} color={COLORS.primary} />
                <Text style={styles.serverTitle}>Servers</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.serverRow}
              >
                {sources.map((srv, idx) => {
                  const isActive = activeSourceIdx === idx;
                  return (
                    <TouchableOpacity
                      key={`${srv.name}-${idx}`}
                      style={[styles.serverTab, isActive && styles.activeServerTab]}
                      onPress={() => setActiveSourceIdx(idx)}
                    >
                      <Text style={[styles.serverTabText, isActive && styles.activeServerTabText]}>
                        {srv.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Episode Playlist / Grid */}
          {episodes.length > 0 && (
            <View style={styles.episodesSection}>
              <Text style={styles.sectionTitle}>Episodes</Text>
              <ScrollView
                ref={epScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.epRow}
              >
                {episodes.map((ep, idx) => {
                  const epNum = ep.number || idx + 1;
                  const isActive = epNum === currentEp;
                  return (
                    <TouchableOpacity
                      key={`ep-${epNum}`}
                      style={[styles.epGridItem, isActive && styles.epGridItemActive]}
                      onPress={() => setCurrentEp(epNum)}
                    >
                      <Text style={[styles.epGridText, isActive && styles.epGridTextActive]}>
                        {epNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.serverTitleRow}>
              <MessageCircle size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Comments</Text>
            </View>

            {/* Comment Input */}
            {user ? (
              <View style={styles.commentInputRow}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.commentAvatar} />
                ) : (
                  <View style={styles.commentAvatarFallback}>
                    <Text style={styles.commentAvatarInitial}>
                      {user.username?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.commentInputBox}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={COLORS.textDark}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
                    onPress={handlePostComment}
                    disabled={!newComment.trim()}
                  >
                    <Send size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.loginToComment}>
                <Text style={styles.loginToCommentText}>Log in to post a comment</Text>
              </View>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((comment, i) => (
                  <View key={`comment-${i}`} style={styles.commentItem}>
                    {comment.avatar ? (
                      <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarFallback}>
                        <Text style={styles.commentAvatarInitial}>
                          {(comment.username || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{comment.username || "User"}</Text>
                        <Text style={styles.commentTime}>
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 40,
  },
  playerContainer: {
    width: width,
    height: (width * 9) / 16,
    backgroundColor: "#000",
  },
  playerLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  panelContent: {
    padding: 16,
  },
  episodeInfoTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  navEpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  navEpText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  epBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  epBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  serverSection: {
    marginBottom: 24,
  },
  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  serverTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  serverRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  serverTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  activeServerTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serverTabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  activeServerTabText: {
    color: COLORS.text,
  },
  episodesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  epRow: {
    gap: 8,
    paddingVertical: 4,
  },
  epGridItem: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  epGridItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  epGridText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "bold",
  },
  epGridTextActive: {
    color: COLORS.text,
  },
  commentsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 24,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  commentAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarInitial: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  commentInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  commentInput: {
    flex: 1,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
  },
  loginToComment: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  loginToCommentText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  commentsList: {
    gap: 16,
  },
  noCommentsText: {
    color: COLORS.textDark,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "bold",
  },
  commentTime: {
    color: COLORS.textDark,
    fontSize: 11,
  },
  commentText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
