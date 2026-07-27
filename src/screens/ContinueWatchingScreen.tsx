import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetRecentlyWatched, apiDeleteWatchedItem } from "../services/api";
import { Play, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react-native";

export default function ContinueWatchingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async (targetPage: number) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await apiGetRecentlyWatched(user.id, 20, targetPage);
      setItems(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [user?.id, page]);

  const handleDelete = async (id: string, title: string) => {
    if (!user?.id) return;
    try {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await apiDeleteWatchedItem(id, user.id);
    } catch {
      Alert.alert("Error", "Failed to remove item");
      fetchHistory(page);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Watch History</Text>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={40} color={COLORS.textDark} />
          <Text style={styles.emptyTitle}>No Watch History</Text>
          <Text style={styles.emptySubtitle}>Start watching anime to see your progress here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Watch", { animeId: item.animeId, episodeNumber: item.episodeNumber, animeTitle: item.animeTitle })}
            >
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.animeTitle} numberOfLines={1}>{item.animeTitle}</Text>
                <Text style={styles.epText}>Episode {item.episodeNumber}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${item.progressPct || 0}%` }]} />
                </View>
              </View>

              <TouchableOpacity style={styles.trashBtn} onPress={() => handleDelete(item.id, item.animeTitle)}>
                <Trash2 size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && styles.disabledPageBtn]}
            disabled={page === 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={18} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.pageText}>Page {page} of {totalPages}</Text>

          <TouchableOpacity
            style={[styles.pageBtn, page === totalPages && styles.disabledPageBtn]}
            disabled={page === totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 16,
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
    fontSize: 20,
    fontWeight: "900",
  },
  loaderCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
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
    marginTop: 4,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  thumb: {
    width: 60,
    height: 80,
    borderRadius: 10,
    backgroundColor: COLORS.card,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  animeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  epText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  trashBtn: {
    padding: 8,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 16,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledPageBtn: {
    opacity: 0.3,
  },
  pageText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
});
