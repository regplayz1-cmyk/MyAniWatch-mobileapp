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
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          
          .tsp-wrap {
            --accent:       #e8a838;
            --accent-2:     #f5c84a;
            --accent-dim:   rgba(232, 168, 56, 0.15);
            --accent-glow:  rgba(232, 168, 56, 0.5);
            --accent-ring:  rgba(232, 168, 56, 0.35);

            --white:        #ffffff;
            --white-90:     rgba(255,255,255,0.90);
            --white-70:     rgba(255,255,255,0.70);
            --white-45:     rgba(255,255,255,0.45);
            --white-20:     rgba(255,255,255,0.20);
            --white-10:     rgba(255,255,255,0.10);
            --white-06:     rgba(255,255,255,0.06);

            --glass-bg:     rgba(8, 8, 12, 0.82);
            --glass-bg-2:   rgba(14, 14, 20, 0.92);
            --glass-border: rgba(255,255,255,0.09);
            --glass-border-h: rgba(255,255,255,0.20);

            --font-ui:   'Inter', system-ui, sans-serif;
            --font-mono: 'DM Mono', monospace;

            --radius-sm: 6px;
            --radius:    10px;
            --radius-lg: 14px;

            --ctrl-h:    72px;
            --seek-h:    4px;
            --seek-h-hv: 7px;
            --thumb-sz:  15px;

            --transition: 0.18s cubic-bezier(0.16,1,0.3,1);
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 100%; height: 100%; background: #000; overflow: hidden; font-family: var(--font-ui); }

          .tsp-wrap {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
            color: var(--white);
            user-select: none;
            -webkit-user-select: none;
          }

          .tsp-video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            z-index: 1;
          }

          .tsp-hud {
            position: absolute;
            top: 0; left: 0; right: 0;
            padding: 14px 18px 48px;
            background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%);
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            opacity: 0;
            transition: opacity var(--transition);
            pointer-events: none;
            z-index: 30;
          }
          .tsp-wrap.ui .tsp-hud { opacity: 1; }

          .tsp-hud-left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
          .tsp-hud-name {
            font-size: 13px; font-weight: 700; color: var(--white);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw;
          }
          .tsp-hud-ep {
            font-size: 11px; font-weight: 600; color: var(--accent); letter-spacing: 0.04em;
          }

          .tsp-center-play {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%,-50%);
            width: 64px; height: 64px;
            border-radius: 50%;
            background: rgba(0,0,0,0.45);
            border: 1.5px solid rgba(255,255,255,0.25);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; z-index: 22;
            transition: background var(--transition), transform var(--transition);
          }
          .tsp-center-play svg { width: 28px; height: 28px; fill: var(--white); margin-left: 3px; }
          .tsp-wrap.playing .tsp-center-play { opacity: 0; pointer-events: none; }

          .tsp-toast {
            position: absolute; top: 16px; left: 50%;
            transform: translateX(-50%) translateY(-10px);
            padding: 6px 16px; background: var(--glass-bg-2);
            border: 1px solid var(--glass-border-h); border-radius: 99px;
            font-size: 12px; font-family: var(--font-mono); color: var(--white-90);
            pointer-events: none; opacity: 0; z-index: 80; white-space: nowrap;
            transition: opacity 0.2s, transform 0.2s;
          }
          .tsp-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

          .tsp-ctrl {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: var(--ctrl-h);
            padding: 0 14px 12px;
            background: linear-gradient(0deg, rgba(0,0,0,0.92) 0%, transparent 100%);
            display: flex; flex-direction: column; justify-content: flex-end; gap: 6px;
            opacity: 0; transition: opacity var(--transition);
            pointer-events: none; z-index: 30;
          }
          .tsp-wrap.ui .tsp-ctrl { opacity: 1; pointer-events: all; }

          .tsp-seek-row { display: flex; align-items: center; gap: 10px; width: 100%; }
          .tsp-tt { font-size: 11px; font-family: var(--font-mono); color: var(--white-70); min-width: 36px; text-align: center; }

          .tsp-seek { flex: 1; height: 24px; display: flex; align-items: center; cursor: pointer; position: relative; }
          .tsp-seek-track { width: 100%; height: var(--seek-h); background: rgba(255,255,255,0.18); border-radius: 99px; position: relative; }
          .tsp-seek-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); width: 0%; }
          .tsp-seek-thumb { position: absolute; top: 50%; width: var(--thumb-sz); height: var(--thumb-sz); background: var(--white); border-radius: 50%; transform: translate(-50%,-50%); }

          .tsp-btn-row { display: flex; align-items: center; gap: 6px; width: 100%; }
          .tsp-cb {
            background: none; border: none; color: var(--white-70); cursor: pointer;
            width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
            border-radius: var(--radius-sm); outline: none;
          }
          .tsp-cb svg { width: 18px; height: 18px; fill: currentColor; }
          .tsp-sp-btn { flex: 1; }

          .tsp-q-lbl {
            padding: 4px 9px; border: 1px solid rgba(255,255,255,0.18); border-radius: var(--radius-sm);
            background: rgba(255,255,255,0.08); color: var(--white-70); font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="tsp-wrap ui" id="tsp-wrap">
          <video class="tsp-video" id="video" playsinline crossorigin="anonymous" autoplay></video>

          <div class="tsp-hud">
            <div class="tsp-hud-left">
              <div class="tsp-hud-name">${title || "Anime"}</div>
              <div class="tsp-hud-ep">EPISODE ${currentEp}</div>
            </div>
          </div>

          <div class="tsp-center-play" id="tsp-center-play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>

          <div class="tsp-toast" id="tsp-toast"></div>

          <div class="tsp-ctrl">
            <div class="tsp-seek-row">
              <span class="tsp-tt" id="tsp-cur">0:00</span>
              <div class="tsp-seek" id="tsp-seek">
                <div class="tsp-seek-track">
                  <div class="tsp-seek-fill" id="tsp-fill"></div>
                  <div class="tsp-seek-thumb" id="tsp-thumb"></div>
                </div>
              </div>
              <span class="tsp-tt" id="tsp-dur">0:00</span>
            </div>

            <div class="tsp-btn-row">
              <button class="tsp-cb" id="tsp-play">
                <svg viewBox="0 0 24 24" id="tsp-play-ic"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button class="tsp-cb" id="tsp-rew">
                <svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
              </button>
              <button class="tsp-cb" id="tsp-fwd">
                <svg viewBox="0 0 24 24"><path d="M11.5 8c2.65 0 5.05.99 6.9 2.6L22 7v9h-9l3.62-3.62c-1.39-1.16-3.16-1.88-5.12-1.88-3.54 0-6.55 2.31-7.6 5.5l-2.37-.78C2.92 11.03 6.85 8 11.5 8z"/></svg>
              </button>

              <div class="tsp-sp-btn"></div>
              <div class="tsp-q-lbl">1080p HD</div>

              <button class="tsp-cb" id="tsp-fs">
                <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              </button>
            </div>
          </div>
        </div>

        <script>
          var wrap = document.getElementById('tsp-wrap');
          var video = document.getElementById('video');
          var cur = document.getElementById('tsp-cur');
          var dur = document.getElementById('tsp-dur');
          var fill = document.getElementById('tsp-fill');
          var thumb = document.getElementById('tsp-thumb');
          var seek = document.getElementById('tsp-seek');
          var playBtn = document.getElementById('tsp-play');
          var playIc = document.getElementById('tsp-play-ic');
          var centerPlay = document.getElementById('tsp-center-play');
          var rewBtn = document.getElementById('tsp-rew');
          var fwdBtn = document.getElementById('tsp-fwd');
          var fsBtn = document.getElementById('tsp-fs');
          var toast = document.getElementById('tsp-toast');

          var uiTimer;
          function resetUi() {
            wrap.classList.add('ui');
            clearTimeout(uiTimer);
            uiTimer = setTimeout(function() {
              if (!video.paused) wrap.classList.remove('ui');
            }, 3000);
          }

          wrap.addEventListener('mousemove', resetUi);
          wrap.addEventListener('touchstart', resetUi);

          function showToast(msg) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 1500);
          }

          function togglePlay() {
            if (video.paused) video.play();
            else video.pause();
          }

          centerPlay.addEventListener('click', togglePlay);
          playBtn.addEventListener('click', togglePlay);

          video.addEventListener('play', function() {
            wrap.classList.add('playing');
            playIc.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            resetUi();
          });

          video.addEventListener('pause', function() {
            wrap.classList.remove('playing');
            wrap.classList.add('ui');
            playIc.innerHTML = '<path d="M8 5v14l11-7z"/>';
          });

          function fmt(s) {
            if (isNaN(s) || !isFinite(s)) return '0:00';
            s = Math.floor(s);
            var m = Math.floor(s / 60);
            var sec = s % 60;
            return m + ':' + (sec < 10 ? '0' + sec : sec);
          }

          video.addEventListener('timeupdate', function() {
            if (!video.duration) return;
            var pct = (video.currentTime / video.duration) * 100;
            fill.style.width = pct + '%';
            thumb.style.left = pct + '%';
            cur.textContent = fmt(video.currentTime);
            dur.textContent = fmt(video.duration);
          });

          seek.addEventListener('click', function(e) {
            var rect = seek.getBoundingClientRect();
            var pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
          });

          rewBtn.addEventListener('click', function() {
            video.currentTime = Math.max(0, video.currentTime - 10);
            showToast('-10s');
          });

          fwdBtn.addEventListener('click', function() {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
            showToast('+10s');
          });

          fsBtn.addEventListener('click', function() {
            if (document.fullscreenElement) document.exitFullscreen();
            else wrap.requestFullscreen();
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
