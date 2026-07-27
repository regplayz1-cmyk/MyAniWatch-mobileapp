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
import { Search, X, SlidersHorizontal } from "lucide-react-native";

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Slice of Life"];

export default function BrowseScreen({ navigation }: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await apiSearchAnime(text);
      const items = res.data?.media || res.results || res.animes || [];
      setResults(items);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anime title..."
            placeholderTextColor={COLORS.textDark}
            value={query}
            onChangeText={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
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
                  handleSearch(newG || query || "Action");
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
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Search Anime</Text>
          <Text style={styles.emptySubtitle}>
            Type any anime name or select a genre above to browse available titles.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => navigation.navigate("AnimeDetails", { id: item.id, anime: item })}
            >
              <Image
                source={{ uri: item.coverImage?.large || item.coverImage?.medium || item.poster }}
                style={styles.gridImage}
              />
              <Text style={styles.gridTitle} numberOfLines={2}>
                {item.title?.english || item.title?.romaji || item.name || "Anime"}
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
    paddingTop: 16,
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
    fontSize: 15,
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
    marginBottom: 6,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
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
