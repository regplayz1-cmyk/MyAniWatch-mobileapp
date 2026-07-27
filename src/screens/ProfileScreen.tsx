import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetLeaderboard, apiGetWatchlist } from "../services/api";
import { User, LogOut, Trophy, Bookmark, Shield, Award, Sparkles } from "lucide-react-native";

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadRes, listRes] = await Promise.all([
        apiGetLeaderboard().catch(() => ({ leaderboard: [] })),
        user?.id ? apiGetWatchlist(user.id).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      setLeaderboard(leadRes.leaderboard || []);
      setWatchlistCount((listRes.items || []).length);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>User Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image
          source={{ uri: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || "Anime"}` }}
          style={styles.avatar}
        />
        <Text style={styles.username}>{user?.username || "Guest User"}</Text>
        <Text style={styles.email}>{user?.email || "guest@myaniwatch.com"}</Text>

        <View style={styles.roleBadge}>
          <Shield size={12} color={COLORS.secondary} />
          <Text style={styles.roleText}>{user?.role || "MEMBERSHIP ACTIVE"}</Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Bookmark size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{watchlistCount}</Text>
            <Text style={styles.statLabel}>Watchlist</Text>
          </View>

          <View style={styles.statBox}>
            <Award size={18} color={COLORS.secondary} />
            <Text style={styles.statValue}>LVL 12</Text>
            <Text style={styles.statLabel}>Otaku Tier</Text>
          </View>
        </View>
      </View>

      {/* Leaderboard Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trophy size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Community Leaderboard</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
        ) : (
          leaderboard.slice(0, 5).map((item, idx) => (
            <View key={item.id || idx} style={styles.leaderRow}>
              <Text style={styles.rankText}>#{idx + 1}</Text>
              <Image source={{ uri: item.avatar }} style={styles.leaderAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName}>{item.username}</Text>
                <Text style={styles.leaderSub}>{item.episodesWatched || 0} episodes watched</Text>
              </View>
              <View style={styles.xpBadge}>
                <Sparkles size={10} color={COLORS.primary} />
                <Text style={styles.xpText}>{item.xp || 1000} XP</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    marginBottom: 12,
  },
  username: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  email: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,229,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  roleText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  rankText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "900",
    width: 24,
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
  },
  leaderName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  leaderSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
});
