import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetTrending, apiGetPopular, apiGetRecentlyWatched } from "../services/api";
import { Play, TrendingUp, Sparkles, Clock, Flame } from "lucide-react-native";

const { width } = Dimensions.get("window");

const extractAnimeList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.data?.media)) return res.data.media;
  if (Array.isArray(res.animes)) return res.animes;
  if (Array.isArray(res.trendingAnimes)) return res.trendingAnimes;
  if (Array.isArray(res.topAiringAnimes)) return res.topAiringAnimes;
  return [];
};

const getImageUri = (item: any): string => {
  if (!item) return "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500";
  return (
    item.coverImage?.extraLarge ||
    item.coverImage?.large ||
    item.coverImage?.medium ||
    item.poster ||
    item.bannerImage ||
    item.image ||
    item.thumbnail ||
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500"
  );
};

const getTitleString = (item: any): string => {
  if (!item) return "Anime";
  if (typeof item.title === "string") return item.title;
  return (
    item.title?.english ||
    item.title?.romaji ||
    item.title?.native ||
    item.name ||
    "Featured Anime"
  );
};

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [trending, setTrending] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [trendRes, popRes] = await Promise.all([
        apiGetTrending().catch(() => null),
        apiGetPopular().catch(() => null),
      ]);

      const trendItems = extractAnimeList(trendRes);
      const popItems = extractAnimeList(popRes);

      setTrending(trendItems);
      setPopular(popItems);

      if (user?.id) {
        const watchRes = await apiGetRecentlyWatched(user.id, 5).catch(() => ({ items: [] }));
        setContinueWatching(watchRes.items || []);
      }
    } catch (err) {
      console.error("Home load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [user?.id]);

  const heroItem = trending[0] || popular[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadHomeData();
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingSub}>Fetching latest anime streams...</Text>
        </View>
      ) : (
        <>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>MyAniWatch</Text>
              <Text style={styles.headerSubtitle}>
                {user ? `Welcome back, ${user.username}!` : "Explore top anime series"}
              </Text>
            </View>
          </View>

          {/* Hero Banner */}
          {heroItem && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.heroCard}
              onPress={() => navigation.navigate("AnimeDetails", { id: heroItem.id, anime: heroItem })}
            >
              <Image source={{ uri: getImageUri(heroItem) }} style={styles.heroImage} />
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.badge}>
                  <Flame size={12} color={COLORS.secondary} />
                  <Text style={styles.badgeText}>TRENDING #1</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {getTitleString(heroItem)}
                </Text>
                <TouchableOpacity
                  style={styles.watchNowBtn}
                  onPress={() => navigation.navigate("AnimeDetails", { id: heroItem.id, anime: heroItem })}
                >
                  <Play size={16} color={COLORS.text} fill={COLORS.text} />
                  <Text style={styles.watchNowText}>Watch Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {/* Continue Watching Section */}
          {continueWatching.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Clock size={18} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Continue Watching</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("ContinueWatching")}>
                  <Text style={styles.seeAllText}>See All →</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                horizontal
                data={continueWatching}
                keyExtractor={(item) => item.id || String(Math.random())}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.cwCard}
                    onPress={() =>
                      navigation.navigate("Watch", {
                        animeId: item.animeId,
                        episodeNumber: item.episodeNumber,
                        animeTitle: item.animeTitle,
                      })
                    }
                  >
                    <Image source={{ uri: item.thumbnail || getImageUri(item) }} style={styles.cwImage} />
                    <View style={styles.cwPlayOverlay}>
                      <Play size={18} color={COLORS.text} fill={COLORS.text} />
                    </View>
                    <View style={styles.cwBadge}>
                      <Text style={styles.cwBadgeText}>EP {item.episodeNumber}</Text>
                    </View>
                    <View style={styles.cwProgressBar}>
                      <View style={[styles.cwProgressFill, { width: `${item.progressPct || 50}%` }]} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Trending Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
            </View>

            {trending.length === 0 ? (
              <Text style={styles.emptySectionText}>No trending anime available at the moment.</Text>
            ) : (
              <FlatList
                horizontal
                data={trending}
                keyExtractor={(item, index) => String(item.id || index)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.animeCard}
                    onPress={() => navigation.navigate("AnimeDetails", { id: item.id, anime: item })}
                  >
                    <Image source={{ uri: getImageUri(item) }} style={styles.animeImage} />
                    <Text style={styles.animeTitle} numberOfLines={2}>
                      {getTitleString(item)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          {/* Popular Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={18} color={COLORS.secondary} />
                <Text style={styles.sectionTitle}>All-Time Popular</Text>
              </View>
            </View>

            {popular.length === 0 ? (
              <Text style={styles.emptySectionText}>No popular anime available at the moment.</Text>
            ) : (
              <FlatList
                horizontal
                data={popular}
                keyExtractor={(item, index) => String(item.id || index)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.animeCard}
                    onPress={() => navigation.navigate("AnimeDetails", { id: item.id, anime: item })}
                  >
                    <Image source={{ uri: getImageUri(item) }} style={styles.animeImage} />
                    <Text style={styles.animeTitle} numberOfLines={2}>
                      {getTitleString(item)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerBar: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  loaderCenter: {
    paddingTop: 120,
    alignItems: "center",
  },
  loadingSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  heroCard: {
    height: 240,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 10, 15, 0.65)",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 229, 255, 0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  badgeText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "900",
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  watchNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  watchNowText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  emptySectionText: {
    color: COLORS.textDark,
    fontSize: 13,
    paddingHorizontal: 16,
  },
  cwCard: {
    width: 140,
    height: 90,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    marginRight: 12,
  },
  cwImage: {
    width: "100%",
    height: "100%",
  },
  cwPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cwBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cwBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  cwProgressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cwProgressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  animeCard: {
    width: 120,
    marginRight: 12,
  },
  animeImage: {
    width: 120,
    height: 170,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  animeTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
});
