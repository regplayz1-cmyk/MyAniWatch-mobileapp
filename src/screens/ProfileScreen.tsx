import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetLeaderboard, apiGetWatchlist, apiUpdateAvatar, apiTogglePrivacy } from "../services/api";
import { LogOut, Trophy, Bookmark, Shield, Award, Sparkles, Edit2, Lock, Unlock } from "lucide-react-native";

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);

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
      setIsPrivate(user?.isPrivate || false);
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!user?.id || !newAvatarUrl.trim()) return;
    try {
      setSavingAvatar(true);
      await apiUpdateAvatar(user.id, newAvatarUrl.trim());
      Alert.alert("Success", "Profile avatar updated successfully!");
      setShowAvatarModal(false);
      setNewAvatarUrl("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update avatar.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!user?.id) return;
    try {
      const res = await apiTogglePrivacy(user.id);
      setIsPrivate(res.isPrivate);
      Alert.alert("Privacy Updated", res.isPrivate ? "Profile is now private." : "Profile is now public.");
    } catch {
      Alert.alert("Error", "Failed to update privacy settings.");
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
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || "Anime"}` }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editAvatarBtn} onPress={() => setShowAvatarModal(!showAvatarModal)}>
            <Edit2 size={14} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.username}>{user?.username || "Otaku Member"}</Text>
        <Text style={styles.email}>{user?.email || "member@myaniwatch.com"}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Shield size={12} color={COLORS.secondary} />
            <Text style={styles.roleText}>{user?.role || "VIP MEMBER"}</Text>
          </View>

          <TouchableOpacity style={styles.privacyBtn} onPress={handleTogglePrivacy}>
            {isPrivate ? <Lock size={12} color="#F59E0B" /> : <Unlock size={12} color={COLORS.primary} />}
            <Text style={styles.privacyText}>{isPrivate ? "Private Profile" : "Public Profile"}</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Avatar Box */}
        {showAvatarModal && (
          <View style={styles.avatarBox}>
            <Text style={styles.avatarBoxTitle}>Update Avatar Image URL</Text>
            <TextInput
              style={styles.avatarInput}
              placeholder="Paste image URL (https://...)"
              placeholderTextColor={COLORS.textDark}
              value={newAvatarUrl}
              onChangeText={setNewAvatarUrl}
            />
            <TouchableOpacity style={styles.saveAvatarBtn} onPress={handleUpdateAvatar} disabled={savingAvatar}>
              {savingAvatar ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Text style={styles.saveAvatarText}>Save Avatar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Bookmark size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{watchlistCount}</Text>
            <Text style={styles.statLabel}>Watchlist</Text>
          </View>

          <View style={styles.statBox}>
            <Award size={18} color={COLORS.secondary} />
            <Text style={styles.statValue}>LVL 15</Text>
            <Text style={styles.statLabel}>Otaku Rank</Text>
          </View>
        </View>
      </View>

      {/* Leaderboard Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trophy size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Global Leaderboard</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
        ) : leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>Leaderboard scores updated daily.</Text>
        ) : (
          leaderboard.slice(0, 5).map((item, idx) => (
            <View key={item.id || idx} style={styles.leaderRow}>
              <Text style={styles.rankText}>#{idx + 1}</Text>
              <Image source={{ uri: item.avatar }} style={styles.leaderAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName}>{item.username}</Text>
                <Text style={styles.leaderSub}>{item.episodesWatched || 0} episodes completed</Text>
              </View>
              <View style={styles.xpBadge}>
                <Sparkles size={10} color={COLORS.primary} />
                <Text style={styles.xpText}>{item.xp || 1200} XP</Text>
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
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.card,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
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
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,229,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "900",
  },
  privacyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  privacyText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  avatarBox: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  avatarBoxTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  avatarInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    color: COLORS.text,
    fontSize: 13,
    marginBottom: 10,
  },
  saveAvatarBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  saveAvatarText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
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
  emptyText: {
    color: COLORS.textDark,
    fontSize: 12,
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
