import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Bookmark, Flag, Star, Tv, Clock, Calendar, Check, MoreHorizontal } from "lucide-react-native";
import { COLORS } from "../theme/colors";
import { apiGetAnimeDetails, apiGetEpisodes, apiToggleWatchlist } from "../services/api";

const { width } = Dimensions.get("window");

export default function AnimeDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [isWatchlisted, setIsWatchlisted] = useState(false); // Can be linked to real status if available

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [detailsRes, episodesRes] = await Promise.all([
        apiGetAnimeDetails(id).catch(() => null),
        apiGetEpisodes(id).catch(() => null),
      ]);

      if (detailsRes?.data) {
        setDetails(detailsRes.data);
      }
      if (episodesRes?.data?.episodes) {
        setEpisodes(episodesRes.data.episodes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchlist = async () => {
    try {
      if (!details?.anime?.info) return;
      const { name, poster } = details.anime.info;
      await apiToggleWatchlist(id, name, poster, isWatchlisted ? "removed" : "watching");
      setIsWatchlisted(!isWatchlisted);
    } catch (err) {
      console.error("Watchlist error", err);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {["Overview", "Episodes", "Relations"].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => {
    if (!details?.anime) return null;
    const { info, moreInfo } = details.anime;

    return (
      <View style={styles.overviewContainer}>
        {/* Left Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailLabel}>Japanese:</Text>
          <Text style={styles.detailValue}>{moreInfo?.japanese || "N/A"}</Text>

          <Text style={styles.detailLabel}>Aired:</Text>
          <Text style={styles.detailValue}>{moreInfo?.aired || "N/A"}</Text>

          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>{moreInfo?.duration || "N/A"}</Text>

          <Text style={styles.detailLabel}>Studio:</Text>
          <Text style={styles.detailValue}>{moreInfo?.studios || "N/A"}</Text>

          <Text style={styles.detailLabel}>Genres:</Text>
          <View style={styles.genresContainer}>
            {moreInfo?.genres?.map((g: string, i: number) => (
              <View key={i} style={styles.genreBadge}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right Synopsis */}
        <View style={styles.synopsisContainer}>
          <Text style={styles.synopsisTitle}>Synopsis</Text>
          <Text style={styles.synopsisText}>
            {info?.description?.replace(/<[^>]*>?/gm, "") || "No synopsis available."}
          </Text>
        </View>
      </View>
    );
  };

  const renderEpisodes = () => {
    if (!episodes || episodes.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No episodes available.</Text>
        </View>
      );
    }

    return (
      <View style={styles.episodesContainer}>
        {episodes.map((ep) => (
          <TouchableOpacity
            key={ep.episodeId || ep.number}
            style={styles.episodeButton}
            onPress={() =>
              navigation.navigate("Watch", {
                animeId: id,
                episode: ep.number,
                title: details?.anime?.info?.name,
                poster: details?.anime?.info?.poster,
                malId: details?.anime?.info?.malId,
              })
            }
          >
            <Text style={styles.episodeNumber}>{ep.number}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRelations = () => {
    const seasons = details?.seasons;
    if (!seasons || seasons.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No related seasons found.</Text>
        </View>
      );
    }

    return (
      <View style={styles.relationsContainer}>
        {seasons.map((season: any, idx: number) => (
          <TouchableOpacity
            key={idx}
            style={styles.relationCard}
            onPress={() => {
              if (season.id && season.id !== id) {
                navigation.push("AnimeDetails", { id: season.id });
              }
            }}
          >
            <Image
              source={{ uri: season.poster || details?.anime?.info?.poster }}
              style={styles.relationPoster}
              resizeMode="cover"
            />
            <View style={styles.relationInfo}>
              <Text style={styles.relationTitle} numberOfLines={2}>
                {season.name || season.title}
              </Text>
              <Text style={styles.relationType}>{season.title?.length > 0 ? "Season" : ""}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!details?.anime?.info) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.text }}>Failed to load anime details.</Text>
      </View>
    );
  }

  const { info, moreInfo } = details.anime;
  const recommended = details.recommendedAnimes || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Hero Banner */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: info.poster }} style={styles.heroBanner} blurRadius={10} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(9, 10, 15, 0.8)", COLORS.background]}
          style={styles.heroGradient}
        />
      </View>

      {/* Poster + Info */}
      <View style={styles.headerInfoContainer}>
        <View style={styles.posterWrapper}>
          <Image source={{ uri: info.poster }} style={styles.poster} resizeMode="cover" />
        </View>

        <View style={styles.infoRight}>
          <Text style={styles.title} numberOfLines={3}>
            {info.name}
          </Text>

          <View style={styles.badgesContainer}>
            <View style={[styles.badge, { backgroundColor: COLORS.primaryLight }]}>
              <Star size={12} color={COLORS.primary} />
              <Text style={styles.badgeText}>{info.stats?.rating || "N/A"}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Tv size={12} color={COLORS.text} />
              <Text style={styles.badgeText}>{info.stats?.type || "TV"}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Text style={[styles.badgeText, { color: COLORS.success, marginLeft: 0 }]}>
                {moreInfo?.status || "Unknown"}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Text style={[styles.badgeText, { marginLeft: 0 }]}>
                EP {info.stats?.episodes?.sub || info.stats?.episodes?.dub || "?"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.watchButton}
          onPress={() => {
            if (episodes.length > 0) {
              navigation.navigate("Watch", {
                animeId: id,
                episode: episodes[0].number,
                title: info.name,
                poster: info.poster,
                malId: info.malId,
              });
            }
          }}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryHover]}
            style={styles.watchButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Play size={20} color="#FFF" fill="#FFF" />
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={handleWatchlist}>
          <Bookmark size={20} color={isWatchlisted ? COLORS.primary : COLORS.text} fill={isWatchlisted ? COLORS.primary : "transparent"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Flag size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === "Overview" && renderOverview()}
        {activeTab === "Episodes" && renderEpisodes()}
        {activeTab === "Relations" && renderRelations()}
      </View>

      {/* Recommended Section */}
      {recommended.length > 0 && (
        <View style={styles.recommendedContainer}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <FlatList
            horizontal
            data={recommended}
            keyExtractor={(item, index) => item.id || index.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recommendedCard}
                onPress={() => navigation.push("AnimeDetails", { id: item.id })}
              >
                <Image source={{ uri: item.poster }} style={styles.recommendedPoster} resizeMode="cover" />
                <Text style={styles.recommendedTitle} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  heroContainer: {
    width: "100%",
    height: 250,
    position: "relative",
  },
  heroBanner: {
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  headerInfoContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: -80,
    zIndex: 10,
  },
  posterWrapper: {
    width: 120,
    height: 180,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.5)",
  },
  poster: {
    width: "100%",
    height: "100%",
    borderRadius: 11,
  },
  infoRight: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 20,
    alignItems: "center",
    gap: 12,
  },
  watchButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  watchButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  watchButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContentContainer: {
    padding: 16,
  },
  overviewContainer: {
    flexDirection: "row",
    gap: 16,
  },
  detailsCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
    marginTop: 8,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  genreBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  genreText: {
    color: COLORS.text,
    fontSize: 11,
  },
  synopsisContainer: {
    flex: 1.5,
  },
  synopsisTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  synopsisText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  episodesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  episodeButton: {
    width: (width - 32 - 30) / 4,
    height: 40,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  episodeNumber: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  relationsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  relationCard: {
    width: (width - 32 - 12) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  relationPoster: {
    width: "100%",
    height: 100,
  },
  relationInfo: {
    padding: 8,
  },
  relationTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  relationType: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16,
    marginBottom: 12,
  },
  recommendedContainer: {
    marginTop: 16,
  },
  recommendedList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recommendedCard: {
    width: 120,
  },
  recommendedPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendedTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
  },
});
