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
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import {
  apiGetProfile,
  apiGetWatchStats,
  apiGetRecentlyWatched,
  apiGetWatchlist,
  apiUpdateAvatar,
  apiTogglePrivacy,
  apiDeleteWatchedItem,
} from "../services/api";
import {
  LogOut,
  Edit2,
  Lock,
  Unlock,
  Play,
  Trash2,
  Clock,
  Hash,
  Bookmark,
  Activity,
  X,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const PREMADE_AVATARS = [
  { name: "Luffy", url: "https://cdn.myanimelist.net/r/130x130/images/characters/9/310307.webp?s=63f268f2848fe2433d5a6465a485477d" },
  { name: "Levi", url: "https://cdn.myanimelist.net/r/130x130/images/characters/2/241413.webp?s=5bf42b38d1b407a974435986e64442e0" },
  { name: "Zoro", url: "https://cdn.myanimelist.net/r/130x130/images/characters/3/100534.webp?s=e06c9995fb237aa1094e3d466805be09" },
  { name: "Killua", url: "https://cdn.myanimelist.net/r/130x130/images/characters/2/327920.webp?s=e34a8fbb6c23c7db66860bf5a9634a5b" },
  { name: "Naruto", url: "https://cdn.myanimelist.net/r/130x130/images/characters/2/284121.webp?s=58b3ec8dd78f4b9e50c7603833ca62c3" },
  { name: "Gojo", url: "https://cdn.myanimelist.net/r/130x130/images/characters/15/422168.webp?s=d49c44e98d3e4abd75fecfe53277eb58" },
  { name: "Eren", url: "https://cdn.myanimelist.net/r/130x130/images/characters/10/216895.webp?s=e6a401eb2cda74543391ecb037bef5b3" },
  { name: "Mikasa", url: "https://cdn.myanimelist.net/r/130x130/images/characters/9/215563.webp?s=90028ebc8c8acc00ad9b28dbac1e15ed" },
  { name: "Rem", url: "https://cdn.myanimelist.net/r/130x130/images/characters/9/311327.webp?s=e2feb20185885a84a75d083a788ae620" },
  { name: "Itachi", url: "https://cdn.myanimelist.net/r/130x130/images/characters/9/284122.webp?s=12ff117636006ebd7cce2b5e68079213" },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ episodes: 0, minutes: 0 });
  const [recentlyWatched, setRecentlyWatched] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<"overview" | "watchlist" | "history">("overview");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false); // local state for UI only if no API

  // Edit Drawer State
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const savedBio = await AsyncStorage.getItem(`bio_${user.id}`);
      const [profRes, statsRes, histRes, watchRes] = await Promise.all([
        apiGetProfile(user.id).catch(() => ({ user: {} })),
        apiGetWatchStats(user.id).catch(() => ({ data: { episodes: 0, minutes: 0 } })),
        apiGetRecentlyWatched(user.id, 20).catch(() => ({ items: [] })),
        apiGetWatchlist(user.id).catch(() => ({ items: [] })),
      ]);

      const mergedBio = savedBio || profRes.user?.bio || "Anime enthusiast. Watching everything.";
      setProfile({ ...(profRes.user || {}), bio: mergedBio });
      setStats({
        episodes: statsRes.data?.episodes || 0,
        minutes: statsRes.data?.minutes || 0,
      });
      setRecentlyWatched(histRes.items || []);
      setWatchlist(watchRes.items || []);
      setIsPrivate(profRes.user?.isPrivate || false);
      
      setEditAvatarUrl(profRes.user?.avatar || user?.avatar || "");
      setEditBio(mergedBio);
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevelData = () => {
    const xp = (stats.episodes * 10) + (stats.minutes * 1);
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 10)) + 1);
    const nextXp = Math.pow(level, 2) * 10;
    const prevXp = Math.pow(level - 1, 2) * 10;
    const progress = Math.min(100, Math.max(0, ((xp - prevXp) / (nextXp - prevXp)) * 100));

    let rank = "ANIME NOVICE";
    if (level >= 50) rank = "S-RANK ANIME GOD";
    else if (level >= 35) rank = "GRANDMASTER";
    else if (level >= 20) rank = "ELITE BINGE WATCHER";
    else if (level >= 10) rank = "OTAKU VETERAN";
    else if (level >= 5) rank = "ANIME APPRENTICE";

    return { xp, level, rank, progress };
  };

  const { xp, level, rank, progress } = calculateLevelData();

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

  const handleDeleteHistory = async (id: string) => {
    if (!user?.id) return;
    try {
      await apiDeleteWatchedItem(id, user.id);
      setRecentlyWatched((prev) => prev.filter((item) => item.id !== id));
    } catch {
      Alert.alert("Error", "Failed to delete item from history.");
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      setSavingProfile(true);
      await apiUpdateAvatar(user.id, editAvatarUrl);
      if (editBio) {
        await AsyncStorage.setItem(`bio_${user.id}`, editBio);
      }
      setProfile((prev: any) => ({ ...prev, avatar: editAvatarUrl, bio: editBio }));
      setShowEditDrawer(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const renderOverview = () => {
    const continueWatching = recentlyWatched.slice(0, 6);
    if (continueWatching.length === 0) {
      return <Text style={styles.emptyText}>No recent activity.</Text>;
    }
    return (
      <View style={styles.grid}>
        {continueWatching.map((item, idx) => (
          <TouchableOpacity
            key={`cw-${item.id || idx}`}
            style={styles.gridCard}
            onPress={() => navigation.navigate("Watch", { animeId: item.animeId, episode: item.episodeNumber, title: item.animeTitle, poster: item.posterUrl })}
          >
            <Image source={{ uri: item.posterUrl }} style={styles.gridImage} />
            <View style={styles.epBadge}>
              <Text style={styles.epBadgeText}>EP {item.episodeNumber}</Text>
            </View>
            <View style={styles.playOverlay}>
              <Play size={20} color={COLORS.text} fill={COLORS.text} />
            </View>
            <Text style={styles.gridTitle} numberOfLines={1}>{item.animeTitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderWatchlist = () => {
    if (watchlist.length === 0) {
      return <Text style={styles.emptyText}>Your watchlist is empty.</Text>;
    }
    return (
      <View style={styles.grid}>
        {watchlist.map((item, idx) => (
          <TouchableOpacity
            key={`wl-${item.id || idx}`}
            style={styles.gridCard}
            onPress={() => navigation.navigate("AnimeDetails", { id: item.animeId })}
          >
            <Image source={{ uri: item.posterUrl || item.image }} style={styles.gridImage} />
            <Text style={styles.gridTitle} numberOfLines={2}>{item.title || item.animeTitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHistory = () => {
    if (recentlyWatched.length === 0) {
      return <Text style={styles.emptyText}>No watch history.</Text>;
    }
    return (
      <View style={styles.listContainer}>
        {recentlyWatched.map((item, idx) => (
          <View key={`hist-${item.id || idx}`} style={styles.listItem}>
            <Image source={{ uri: item.posterUrl }} style={styles.listImage} />
            <View style={styles.listInfo}>
              <Text style={styles.listTitle} numberOfLines={1}>{item.animeTitle}</Text>
              <Text style={styles.listSub}>Watched Episode {item.episodeNumber}</Text>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity
                style={styles.listBtn}
                onPress={() => navigation.navigate("Watch", { animeId: item.animeId, episode: item.episodeNumber, title: item.animeTitle, poster: item.posterUrl })}
              >
                <Play size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.listBtnDel} onPress={() => handleDeleteHistory(item.id)}>
                <Trash2 size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading && !profile) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const avatarSource = profile?.avatar || user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || "Anime"}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Banner */}
        <LinearGradient
          colors={[COLORS.primary, 'transparent']}
          style={styles.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatarSource }} style={styles.avatar} />
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{level}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{profile?.username || user?.username || "Otaku Member"}</Text>
              <Text style={styles.rankText}>{rank}</Text>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.xpText}>{xp} XP</Text>
            </View>
          </View>

          {profile?.bio && (
            <Text style={styles.bioText}>{profile.bio}</Text>
          )}

          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowEditDrawer(true)}>
              <Edit2 size={14} color={COLORS.text} />
              <Text style={styles.actionBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]} onPress={logout}>
              <LogOut size={14} color={COLORS.danger} />
              <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.togglesRow}>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsIncognito(!isIncognito)}>
              {isIncognito ? <Lock size={14} color="#F59E0B" /> : <Unlock size={14} color={COLORS.textMuted} />}
              <Text style={styles.toggleText}>Incognito</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleBtn} onPress={handleTogglePrivacy}>
              {isPrivate ? <Lock size={14} color="#F59E0B" /> : <Unlock size={14} color={COLORS.primary} />}
              <Text style={styles.toggleText}>{isPrivate ? "Private" : "Public"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Activity size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statLabel}>XP Points</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={20} color={COLORS.secondary} />
            <Text style={styles.statValue}>{Math.floor(stats.minutes / 60)}h</Text>
            <Text style={styles.statLabel}>Watch Time</Text>
          </View>
          <View style={styles.statItem}>
            <Hash size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.episodes}</Text>
            <Text style={styles.statLabel}>Episodes</Text>
          </View>
          <View style={styles.statItem}>
            <Bookmark size={20} color="#10B981" />
            <Text style={styles.statValue}>{watchlist.length}</Text>
            <Text style={styles.statLabel}>Watchlist</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {["overview", "watchlist", "history"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "watchlist" && renderWatchlist()}
          {activeTab === "history" && renderHistory()}
        </View>
      </ScrollView>

      {/* Edit Profile Drawer/Modal */}
      <Modal visible={showEditDrawer} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditDrawer(false)}>
                <X size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerScroll}>
              <Text style={styles.inputLabel}>Choose Avatar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarRow}>
                {PREMADE_AVATARS.map((ava, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.premadeAvatarBtn, editAvatarUrl === ava.url && styles.premadeAvatarActive]}
                    onPress={() => setEditAvatarUrl(ava.url)}
                  >
                    <Image source={{ uri: ava.url }} style={styles.premadeAvatarImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Or Custom Avatar URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={COLORS.textDark}
                value={editAvatarUrl}
                onChangeText={setEditAvatarUrl}
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about yourself..."
                placeholderTextColor={COLORS.textDark}
                value={editBio}
                onChangeText={setEditBio}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.drawerFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroBanner: {
    height: 180,
    width: "100%",
    position: "absolute",
    top: 0,
    opacity: 0.3,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    marginTop: 80,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  levelBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  rankText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 8,
  },
  progressContainer: {
    height: 6,
    backgroundColor: COLORS.card,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  xpText: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: "right",
  },
  bioText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  profileActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  togglesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 16,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  tabActive: {
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    width: (width - 32 - 24) / 3, // 3 columns, 16 padding on each side, 12 gap between
    marginBottom: 16,
    position: "relative",
  },
  gridImage: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  epBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "bold",
  },
  playOverlay: {
    position: "absolute",
    top: "30%",
    left: "50%",
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(139, 92, 246, 0.8)", // Primary color with opacity
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitle: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },
  listImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  listSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  listActions: {
    flexDirection: "row",
    gap: 8,
  },
  listBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  listBtnDel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  drawerContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    padding: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  drawerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  drawerScroll: {
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  avatarRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  premadeAvatarBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  premadeAvatarActive: {
    borderColor: COLORS.primary,
  },
  premadeAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  drawerFooter: {
    paddingTop: 16,
    paddingBottom: 20, // Add extra padding for safe area
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});
