import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Keyboard
} from "react-native";
import { COLORS } from "../theme/colors";
import { apiSearchAnime } from "../services/api";
import { Search, X, Compass, Star, Tv } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller"
];

const SORTS = [
  { label: "Trending", value: "TRENDING_DESC" },
  { label: "Popular", value: "POPULARITY_DESC" },
  { label: "Recent", value: "START_DATE_DESC" },
  { label: "Top Score", value: "SCORE_DESC" }
];

const extractAnimeList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.media)) return res.media;
  if (Array.isArray(res.data?.media)) return res.data.media;
  if (Array.isArray(res.animes)) return res.animes;
  return [];
};

const getPageInfo = (res: any) => {
  if (!res) return { hasNextPage: false };
  if (res.pageInfo) return res.pageInfo;
  if (res.data?.pageInfo) return res.data.pageInfo;
  return { hasNextPage: false };
};

const getImageUri = (item: any): string => {
  if (!item) return "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500";
  return (
    item.coverImage?.extraLarge ||
    item.coverImage?.large ||
    item.coverImage?.medium ||
    item.poster ||
    item.image ||
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500"
  );
};

const getTitleString = (item: any): string => {
  if (!item) return "Anime";
  if (typeof item.title === "string") return item.title;
  return item.title?.english || item.title?.romaji || item.name || "Anime Title";
};

export default function BrowseScreen({ navigation }: any) {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<string>("TRENDING_DESC");
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Debounce logic for search query
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchSearch = async (searchTerm: string, genreFilter: string | null, sortParam: string, pageNum: number, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const res = await apiSearchAnime(searchTerm, pageNum, genreFilter || undefined, sortParam).catch(() => null);
      const items = extractAnimeList(res);
      const pInfo = getPageInfo(res);
      
      if (isLoadMore) {
        setResults((prev) => [...prev, ...items]);
      } else {
        setResults(items);
      }
      
      setHasNextPage(pInfo.hasNextPage !== false && items.length > 0);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // When filters change, reset to page 1
  useEffect(() => {
    setPage(1);
    fetchSearch(debouncedQuery, selectedGenre, selectedSort, 1, false);
  }, [debouncedQuery, selectedGenre, selectedSort]);

  const handleLoadMore = () => {
    if (hasNextPage && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSearch(debouncedQuery, selectedGenre, selectedSort, nextPage, true);
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const eps = item.episodes || item.totalEpisodes || "?";
    const type = item.format || item.type || "TV";

    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigation.navigate("AnimeDetails", { id: item.id, anime: item })}
        activeOpacity={0.7}
      >
        <Image source={{ uri: getImageUri(item) }} style={styles.gridImage} />
        <LinearGradient
          colors={["transparent", "rgba(9, 10, 15, 0.8)", "#090A0F"]}
          style={styles.cardGradient}
        >
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Tv size={10} color={COLORS.text} />
              <Text style={styles.badgeText}>{type}</Text>
            </View>
            <View style={styles.badge}>
              <Star size={10} color={COLORS.text} />
              <Text style={styles.badgeText}>{eps} EPS</Text>
            </View>
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {getTitleString(item)}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anime title..."
            placeholderTextColor={COLORS.textDark}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
              <X size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        {/* Genre Pills */}
        <View style={styles.genresWrapper}>
          <FlatList
            horizontal
            data={GENRES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresList}
            renderItem={({ item }) => {
              const isSelected = selectedGenre === item;
              return (
                <TouchableOpacity
                  style={[styles.genrePill, isSelected && styles.activeGenrePill]}
                  onPress={() => setSelectedGenre(isSelected ? null : item)}
                >
                  <Text style={[styles.genreText, isSelected && styles.activeGenreText]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Sort Options */}
        <View style={styles.sortsWrapper}>
          <FlatList
            horizontal
            data={SORTS}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortsList}
            renderItem={({ item }) => {
              const isSelected = selectedSort === item.value;
              return (
                <TouchableOpacity
                  style={[styles.sortPill, isSelected && styles.activeSortPill]}
                  onPress={() => setSelectedSort(item.value)}
                >
                  <Text style={[styles.sortText, isSelected && styles.activeSortText]}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Search Results Grid */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Compass size={60} color={COLORS.textDark} />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching for a different anime title or clearing genre filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={3}
          keyExtractor={(item, idx) => String(item.id || idx)}
          contentContainerStyle={styles.gridContent}
          renderItem={renderCard}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 48,
  },
  searchHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  clearBtn: {
    padding: 4,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  genresWrapper: {
    height: 40,
    marginBottom: 12,
  },
  genresList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genrePill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
  },
  activeGenrePill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  activeGenreText: {
    color: COLORS.text,
  },
  sortsWrapper: {
    height: 36,
  },
  sortsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    justifyContent: "center",
  },
  activeSortPill: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  sortText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  activeSortText: {
    color: COLORS.text,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  gridCard: {
    flex: 1 / 3,
    margin: 4,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    justifyContent: "flex-end",
    padding: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: "bold",
  },
  gridTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "bold",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
