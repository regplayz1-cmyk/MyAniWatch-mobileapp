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
} from "react-native";
import { COLORS } from "../theme/colors";
import { apiSearchAnime } from "../services/api";
import { Search, X, Compass } from "lucide-react-native";

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Slice of Life"];

const extractAnimeList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.media)) return res.media;
  if (Array.isArray(res.data?.media)) return res.data.media;
  if (Array.isArray(res.animes)) return res.animes;
  return [];
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
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSearch = async (searchTerm: string, genreFilter: string | null) => {
    try {
      setLoading(true);
      const res = await apiSearchAnime(searchTerm, 1, genreFilter || undefined).catch(() => null);
      const items = extractAnimeList(res);
      setResults(items);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch popular Action or default browse
    fetchSearch("", selectedGenre);
  }, [selectedGenre]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    fetchSearch(text, selectedGenre);
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anime title (e.g. Naruto, One Piece)..."
            placeholderTextColor={COLORS.textDark}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            onSubmitEditing={() => fetchSearch(query, selectedGenre)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange("")}>
              <X size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Genre Pills */}
      <View style={{ height: 44, marginVertical: 12 }}>
        <FlatList
          horizontal
          data={GENRES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isSelected = selectedGenre === item;
            return (
              <TouchableOpacity
                style={[styles.genrePill, isSelected && styles.activeGenrePill]}
                onPress={() => {
                  const newG = isSelected ? null : item;
                  setSelectedGenre(newG);
                }}
              >
                <Text style={[styles.genreText, isSelected && styles.activeGenreText]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Search Results Grid */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching anime database...</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Compass size={40} color={COLORS.textDark} />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching for a different anime title or clearing genre filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(item, idx) => String(item.id || idx)}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => navigation.navigate("AnimeDetails", { id: item.id, anime: item })}
            >
              <Image source={{ uri: getImageUri(item) }} style={styles.gridImage} />
              <Text style={styles.gridTitle} numberOfLines={2}>
                {getTitleString(item)}
              </Text>
            </TouchableOpacity>
          )}
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
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  genrePill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeGenrePill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  activeGenreText: {
    color: COLORS.text,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  gridCard: {
    flex: 0.5,
    margin: 6,
  },
  gridImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  gridTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
});
