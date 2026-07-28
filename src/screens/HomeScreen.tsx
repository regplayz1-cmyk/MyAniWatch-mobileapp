import React, { useEffect, useState, useRef } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetHomePage } from "../services/api";
import {
  Play,
  TrendingUp,
  Sparkles,
  Calendar,
  Clock,
  Flame,
  Trophy,
  Info,
  Mic,
  Subtitles,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();

  const [data, setData] = useState<any>({
    spotlightAnimes: [],
    trendingAnimes: [],
    latestEpisodeAnimes: [],
    topUpcomingAnimes: [],
    top10Animes: { today: [], week: [], month: [] },
    mostPopularAnimes: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [top10Tab, setTop10Tab] = useState<"today" | "week" | "month">("today");

  const [activeSpotlightIndex, setActiveSpotlightIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const loadHomeData = async () => {
    try {
      const res = await apiGetHomePage();
      if (res?.data) {
        setData(res.data);
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
  }, []);

  // Auto-scroll logic for spotlight
  useEffect(() => {
    if (data.spotlightAnimes.length > 0) {
      const interval = setInterval(() => {
        let nextIndex = activeSpotlightIndex + 1;
        if (nextIndex >= data.spotlightAnimes.length) {
          nextIndex = 0;
        }
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setActiveSpotlightIndex(nextIndex);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSpotlightIndex, data.spotlightAnimes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const renderSpotlight = ({ item, index }: { item: any; index: number }) => {
    return (
      <View style={styles.spotlightContainer}>
        <Image source={{ uri: item.poster || item.bannerImage }} style={styles.spotlightImage} />
        <LinearGradient
          colors={["transparent", "rgba(9, 10, 15, 0.8)", COLORS.background]}
          style={styles.spotlightGradient}
        />
        <View style={styles.spotlightContent}>
          <View style={styles.spotlightRankBadge}>
            <Text style={styles.spotlightRankText}>#{item.rank || index + 1} Spotlight</Text>
          </View>
          <Text style={styles.spotlightTitle} numberOfLines={2}>
            {item.name || item.title || item.jname}
          </Text>
          <View style={styles.spotlightMeta}>
            <View style={styles.spotlightMetaItem}>
              <Play size={12} color={COLORS.textMuted} />
              <Text style={styles.spotlightMetaText}>{item.type || "TV"}</Text>
            </View>
            <View style={styles.spotlightMetaItem}>
              <Clock size={12} color={COLORS.textMuted} />
              <Text style={styles.spotlightMetaText}>{item.episodes?.sub || item.episodes?.dub || 12} Episodes</Text>
            </View>
            {Boolean(item.status) && (
              <View style={styles.spotlightMetaItem}>
                <Flame size={12} color={COLORS.secondary} />
                <Text style={[styles.spotlightMetaText, { color: COLORS.secondary }]}>{item.status}</Text>
              </View>
            )}
          </View>
          <Text style={styles.spotlightDesc} numberOfLines={3}>
            {item.description || "No description available."}
          </Text>
          <View style={styles.spotlightActions}>
            <TouchableOpacity
              style={styles.watchNowBtn}
              onPress={() => navigation.navigate("AnimeDetails", { id: item.id })}
            >
              <Play size={18} color="#000" fill="#000" />
              <Text style={styles.watchNowText}>Watch Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => navigation.navigate("AnimeDetails", { id: item.id })}
            >
              <Info size={18} color={COLORS.text} />
              <Text style={styles.detailsText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderAnimeCard = ({ item }: { item: any }) => {
    const title = item.name || item.title || item.jname || "Unknown";
    const poster = item.poster || item.coverImage?.extraLarge || item.image;

    return (
      <TouchableOpacity
        style={styles.animeCard}
        onPress={() => navigation.navigate("AnimeDetails", { id: item.id })}
      >
        <View style={styles.posterContainer}>
          <Image source={{ uri: poster }} style={styles.posterImage} />
          <View style={styles.episodesBadge}>
            {Boolean(item.episodes?.sub && item.episodes.sub > 0) && (
              <View style={styles.epBadgeItem}>
                <Subtitles size={10} color="#000" />
                <Text style={styles.epBadgeText}>{item.episodes.sub}</Text>
              </View>
            )}
            {Boolean(item.episodes?.dub && item.episodes.dub > 0) && (
              <View style={[styles.epBadgeItem, { backgroundColor: COLORS.secondary }]}>
                <Mic size={10} color="#000" />
                <Text style={styles.epBadgeText}>{item.episodes.dub}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardSub}>
          {item.type || "TV"} • {item.status || "Finished"}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTop10Card = ({ item, index }: { item: any; index: number }) => {
    const title = item.name || item.title || item.jname || "Unknown";
    const poster = item.poster || item.coverImage?.extraLarge || item.image;
    
    // Rank styling
    let rankColor = COLORS.card;
    let rankTextColor = COLORS.text;
    if (index === 0) { rankColor = "#FFD700"; rankTextColor = "#000"; }
    else if (index === 1) { rankColor = "#C0C0C0"; rankTextColor = "#000"; }
    else if (index === 2) { rankColor = "#CD7F32"; rankTextColor = "#000"; }

    return (
      <TouchableOpacity
        style={styles.top10Card}
        onPress={() => navigation.navigate("AnimeDetails", { id: item.id })}
      >
        <View style={[styles.rankBox, { backgroundColor: rankColor }]}>
          <Text style={[styles.rankNumber, { color: rankTextColor }]}>{index + 1}</Text>
        </View>
        <Image source={{ uri: poster }} style={styles.top10Image} />
        <View style={styles.top10Info}>
          <Text style={styles.top10Title} numberOfLines={2}>{title}</Text>
          <View style={styles.top10Meta}>
            <View style={styles.top10MetaItem}>
              <Subtitles size={12} color={COLORS.textMuted} />
              <Text style={styles.top10MetaText}>{item.episodes?.sub || "?"}</Text>
            </View>
            <View style={styles.top10MetaItem}>
              <Mic size={12} color={COLORS.textMuted} />
              <Text style={styles.top10MetaText}>{item.episodes?.dub || "?"}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, icon: Icon, color = COLORS.primary }: any) => (
    <View style={styles.sectionHeader}>
      <Icon size={20} color={color} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const SkeletonCard = () => (
    <View style={[styles.animeCard, { opacity: 0.5 }]}>
      <View style={[styles.posterContainer, { backgroundColor: COLORS.cardBorder }]} />
      <View style={{ width: "80%", height: 12, backgroundColor: COLORS.cardBorder, borderRadius: 4, marginBottom: 4 }} />
      <View style={{ width: "50%", height: 10, backgroundColor: COLORS.cardBorder, borderRadius: 4 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Skeleton Hero */}
        <View style={[styles.heroSection, { backgroundColor: COLORS.card, opacity: 0.5 }]} />
        
        {/* Skeleton Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { opacity: 0.5 }]}>
            <View style={{ width: 120, height: 20, backgroundColor: COLORS.cardBorder, borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
    >
      {/* Hero Spotlight Section */}
      {data.spotlightAnimes.length > 0 && (
        <View style={styles.heroSection}>
          <FlatList
            ref={flatListRef}
            data={data.spotlightAnimes}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id || `spotlight-${index}`}
            renderItem={renderSpotlight}
            onMomentumScrollEnd={(e) => {
              const contentOffsetX = e.nativeEvent.contentOffset.x;
              const currentIndex = Math.round(contentOffsetX / width);
              setActiveSpotlightIndex(currentIndex);
            }}
          />
          <View style={styles.pagination}>
            {data.spotlightAnimes.map((_: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeSpotlightIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Trending Now */}
      {data.trendingAnimes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="TRENDING NOW" icon={TrendingUp} color={COLORS.secondary} />
          <FlatList
            horizontal
            data={data.trendingAnimes}
            keyExtractor={(item, index) => item.id || `trending-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={renderAnimeCard}
          />
        </View>
      )}

      {/* Latest Episodes */}
      {data.latestEpisodeAnimes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="LATEST EPISODES" icon={Clock} color={COLORS.primary} />
          <FlatList
            horizontal
            data={data.latestEpisodeAnimes}
            keyExtractor={(item, index) => item.id || `latest-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={renderAnimeCard}
          />
        </View>
      )}

      {/* Top 10 Section */}
      {(data.top10Animes.today?.length > 0 || data.top10Animes.week?.length > 0) && (
        <View style={styles.section}>
          <View style={styles.top10Header}>
            <SectionHeader title="TOP 10" icon={Trophy} color="#FFD700" />
            <View style={styles.tabsContainer}>
              {["today", "week", "month"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, top10Tab === tab && styles.tabBtnActive]}
                  onPress={() => setTop10Tab(tab as any)}
                >
                  <Text style={[styles.tabText, top10Tab === tab && styles.tabTextActive]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <FlatList
            horizontal
            data={data.top10Animes[top10Tab] || []}
            keyExtractor={(item, index) => item.id || `top10-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={renderTop10Card}
          />
        </View>
      )}

      {/* Upcoming Season */}
      {data.topUpcomingAnimes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="UPCOMING SEASON" icon={Calendar} color={COLORS.accent || "#EC4899"} />
          <FlatList
            horizontal
            data={data.topUpcomingAnimes}
            keyExtractor={(item, index) => item.id || `upcoming-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={renderAnimeCard}
          />
        </View>
      )}

      {/* Most Popular */}
      {data.mostPopularAnimes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="MOST POPULAR" icon={Sparkles} color={COLORS.secondary} />
          <FlatList
            horizontal
            data={data.mostPopularAnimes}
            keyExtractor={(item, index) => item.id || `popular-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListPadding}
            renderItem={renderAnimeCard}
          />
        </View>
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
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  heroSection: {
    height: height * 0.55,
    width,
  },
  spotlightContainer: {
    width,
    height: "100%",
  },
  spotlightImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  spotlightGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  spotlightContent: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
  },
  spotlightRankBadge: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  spotlightRankText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  spotlightTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  spotlightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  spotlightMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spotlightMetaText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  spotlightDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  spotlightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  watchNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
  },
  watchNowText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 15,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
  },
  detailsText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 16,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  horizontalListPadding: {
    paddingHorizontal: 16,
    gap: 12,
  },
  animeCard: {
    width: width * 0.35,
  },
  posterContainer: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    marginBottom: 8,
  },
  posterImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  episodesBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    flexDirection: "row",
    borderTopRightRadius: 8,
    overflow: "hidden",
  },
  epBadgeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  epBadgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  top10Header: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "bold",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  top10Card: {
    width: 140,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rankBox: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 8,
  },
  rankNumber: {
    fontWeight: "900",
    fontSize: 12,
  },
  top10Image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#222",
  },
  top10Info: {
    padding: 10,
  },
  top10Title: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  top10Meta: {
    flexDirection: "row",
    gap: 8,
  },
  top10MetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  top10MetaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
