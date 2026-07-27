import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetAllStreamSources, apiSaveWatchedProgress } from "../services/api";
import { ChevronLeft, ChevronRight, Server, AlertCircle } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function WatchScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { animeId, episodeNumber = 1, animeTitle = "Anime", malId } = route.params || {};

  const [currentEp, setCurrentEp] = useState(episodeNumber);
  const [sources, setSources] = useState<Array<{ name: string; url: string; type: "hls" | "iframe" }>>([]);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreamSources();
  }, [animeId, currentEp]);

  const loadStreamSources = async () => {
    try {
      setLoading(true);
      const resSources = await apiGetAllStreamSources(animeId, currentEp, animeTitle, malId);
      setSources(resSources);
      setActiveSourceIdx(0);

      // Save watch history
      if (user?.id) {
        apiSaveWatchedProgress({
          userId: user.id,
          animeId: String(animeId),
          animeTitle,
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

  const activeSource = sources[activeSourceIdx];

  const getPlayerHtml = (sourceUrl: string, type: string) => {
    if (type === "hls" || sourceUrl.includes(".m3u8") || sourceUrl.includes("/api/miruro-hls") || sourceUrl.includes("/api/senshi") || sourceUrl.includes("/api/hdhive")) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; background: #000; }
            body, html { width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            video { width: 100%; height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <video id="video" controls autoplay playsinline crossorigin="anonymous"></video>
          <script>
            var video = document.getElementById('video');
            var videoSrc = '${sourceUrl}';
            if (Hls.isSupported()) {
              var hls = new Hls();
              hls.loadSource(videoSrc);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, function() { video.play(); });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = videoSrc;
              video.addEventListener('loadedmetadata', function() { video.play(); });
            }
          </script>
        </body>
        </html>
      `;
    }
    return null;
  };

  const playerHtml = activeSource ? getPlayerHtml(activeSource.url, activeSource.type) : null;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {animeTitle} - Episode {currentEp}
        </Text>
      </View>

      {/* Video Player Box */}
      <View style={styles.playerContainer}>
        {loading ? (
          <View style={styles.playerLoader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching Stream Servers (Anizone, Anikai, AniBD)...</Text>
          </View>
        ) : activeSource ? (
          <WebView
            key={`${activeSource.url}-${currentEp}`}
            source={playerHtml ? { html: playerHtml } : { uri: activeSource.url }}
            style={styles.webview}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View style={styles.playerLoader}>
            <AlertCircle size={32} color={COLORS.danger} />
            <Text style={styles.errorText}>No available stream servers found for Episode {currentEp}</Text>
          </View>
        )}
      </View>

      {/* Server & Controls Panel */}
      <ScrollView contentContainerStyle={styles.panelContent}>
        {/* Episode Nav Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.navEpBtn, currentEp <= 1 && styles.disabledBtn]}
            disabled={currentEp <= 1}
            onPress={() => setCurrentEp((e: number) => Math.max(1, e - 1))}
          >
            <ChevronLeft size={16} color={COLORS.text} />
            <Text style={styles.navEpText}>Prev Ep</Text>
          </TouchableOpacity>

          <View style={styles.epBadge}>
            <Text style={styles.epBadgeText}>EPISODE {currentEp}</Text>
          </View>

          <TouchableOpacity
            style={styles.navEpBtn}
            onPress={() => setCurrentEp((e: number) => e + 1)}
          >
            <Text style={styles.navEpText}>Next Ep</Text>
            <ChevronRight size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Server Selector Tabs */}
        {sources.length > 0 && (
          <View style={styles.serverSection}>
            <View style={styles.serverTitleRow}>
              <Server size={16} color={COLORS.primary} />
              <Text style={styles.serverTitle}>Available Servers ({sources.length})</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverRow}>
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
      </ScrollView>
    </View>
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
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navEpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
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
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  epBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  serverSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  serverTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  serverRow: {
    flexDirection: "row",
    gap: 8,
  },
  serverTab: {
    paddingHorizontal: 14,
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
});
