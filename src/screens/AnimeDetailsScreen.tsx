import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../theme/colors";
import { apiGetAnimeDetails, apiGetEpisodes, apiToggleWatchlist } from "../services/api";
import { Play, Bookmark, Star, Calendar, Tv, ChevronLeft } from "lucide-react-native";

export default function AnimeDetailsScreen({ route, navigation }: any) {
  const { id, anime: initialAnime } = route.params || {};
  const [details, setDetails] = useState<any>(initialAnime || null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await apiGetAnimeDetails(id).catch(() => null);
      if (res?.data?.media) {
        setDetails(res.data.media);
      }
      const epRes = await apiGetEpisodes(id).catch(() => ({ episodes: [] }));
      const epList = epRes.episodes || epRes.data || [];
      setEpisodes(epList);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWatchlist = async () => {
    try {
      const title = details?.title?.english || details?.title?.romaji || "Anime";
      const thumb = details?.coverImage?.large || details?.coverImage?.medium || "";
      await apiToggleWatchlist(String(id), title, thumb, inWatchlist ? "remove" : "watching");
      setInWatchlist(!inWatchlist);
      Alert.alert("Success", inWatchlist ? "Removed from Watchlist" : "Added to Watchlist!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update watchlist");
    }
  };

  const animeTitle = details?.title?.english || details?.title?.romaji || "Anime Details";
  const coverUrl = details?.coverImage?.large || details?.coverImage?.medium || details?.poster || "";
  const totalEps = episodes.length || details?.episodes || 12;

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={24} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner / Poster Header */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: coverUrl }} style={styles.bannerImage} blurRadius={10} />
          <View style={styles.bannerOverlay} />

          <View style={styles.headerContent}>
            <Image source={{ uri: coverUrl }} style={styles.posterImage} />
            <View style={styles.headerInfo}>
              <Text style={styles.title} numberOfLines={2}>{animeTitle}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.metaBadgeText}>{details?.averageScore ? `${(details.averageScore / 10).toFixed(1)}` : "8.5"}</Text>
                </View>

                <View style={styles.metaBadge}>
                  <Tv size={12} color={COLORS.secondary} />
                  <Text style={styles.metaBadgeText}>{totalEps} Episodes</Text>
                </View>
              </View>

              {/* Watchlist Toggle */}
              <TouchableOpacity
                style={[styles.watchlistBtn, inWatchlist && styles.inWatchlistBtn]}
                onPress={handleToggleWatchlist}
              >
                <Bookmark size={14} color={inWatchlist ? COLORS.primary : COLORS.text} fill={inWatchlist ? COLORS.primary : "transparent"} />
                <Text style={styles.watchlistBtnText}>{inWatchlist ? "Saved in Watchlist" : "+ Watchlist"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Synopsis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.description}>
            {details?.description ? details.description.replace(/<[^>]*>?/gm, "") : "Enjoy streaming this anime series with high-quality playback and synchronized audio subtitles."}
          </Text>
        </View>

        {/* Episodes Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Episodes ({totalEps})</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.episodesGrid}>
              {Array.from({ length: totalEps }).map((_, idx) => {
                const epNum = idx + 1;
                return (
                  <TouchableOpacity
                    key={epNum}
                    style={styles.epButton}
                    onPress={() => navigation.navigate("Watch", { animeId: id, episodeNumber: epNum, animeTitle })}
                  >
                    <Play size={12} color={COLORS.primary} fill={COLORS.primary} />
                    <Text style={styles.epText}>Ep {epNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    position: "absolute",
    top: 48,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    height: 280,
    width: "100%",
    justifyContent: "flex-end",
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 10, 15, 0.8)",
  },
  headerContent: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
    alignItems: "flex-end",
  },
  posterImage: {
    width: 100,
    height: 140,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  watchlistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignSelf: "flex-start",
  },
  inWatchlistBtn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  watchlistBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  episodesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  epButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  epText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
