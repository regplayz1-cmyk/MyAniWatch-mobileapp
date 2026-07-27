import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { apiGetPosts, apiCreatePost, apiLikePost } from "../services/api";
import { MessageSquare, ThumbsUp, Plus, Send, MessageCircle } from "lucide-react-native";

const CATEGORIES = ["General", "Anime Discussion", "Bug Reports", "Recommendations", "Off-Topic"];

export default function CommunityScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await apiGetPosts(selectedCategory || undefined);
      setPosts(res.posts || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please provide both title and content.");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post.");
      return;
    }

    try {
      await apiCreatePost({
        title,
        content,
        category: selectedCategory || "General",
        authorName: user.username,
        authorAvatar: user.avatar,
      });
      setTitle("");
      setContent("");
      setShowCompose(false);
      loadPosts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit post.");
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p))
      );
      await apiLikePost(postId, user.username);
    } catch {
      // Ignore
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSub}>Discussions, reviews, and anime news</Text>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCompose(!showCompose)}>
          <Plus size={18} color={COLORS.text} />
          <Text style={styles.createBtnText}>New Post</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={{ height: 44, marginBottom: 12 }}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[styles.categoryPill, isSelected && styles.activeCategoryPill]}
                onPress={() => setSelectedCategory(isSelected ? null : item)}
              >
                <Text style={[styles.categoryText, isSelected && styles.activeCategoryText]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Compose Box */}
      {showCompose && (
        <View style={styles.composeCard}>
          <Text style={styles.composeTitle}>Create Community Post</Text>
          <TextInput
            style={styles.input}
            placeholder="Post Title"
            placeholderTextColor={COLORS.textDark}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Share your thoughts..."
            placeholderTextColor={COLORS.textDark}
            value={content}
            onChangeText={setContent}
            multiline
          />
          <TouchableOpacity style={styles.submitPostBtn} onPress={handleCreatePost}>
            <Send size={16} color={COLORS.text} />
            <Text style={styles.submitPostText}>Publish Post</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts List */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={40} color={COLORS.textDark} />
          <Text style={styles.emptyTitle}>No Posts Yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to start a conversation in this category!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <Text style={styles.authorName}>{item.authorName}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category || "General"}</Text>
                </View>
              </View>

              <Text style={styles.postTitle}>{item.title}</Text>
              <Text style={styles.postContent}>{item.content}</Text>

              <View style={styles.postFooter}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
                  <ThumbsUp size={14} color={COLORS.primary} />
                  <Text style={styles.actionText}>{item.likesCount || item.likes?.length || 0} Upvotes</Text>
                </TouchableOpacity>

                <View style={styles.actionBtn}>
                  <MessageSquare size={14} color={COLORS.textMuted} />
                  <Text style={styles.actionText}>{item.commentsCount || 0} Comments</Text>
                </View>
              </View>
            </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
  },
  categoryPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeCategoryPill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  activeCategoryText: {
    color: COLORS.text,
  },
  composeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  composeTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: COLORS.text,
    marginBottom: 10,
  },
  submitPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  submitPostText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  authorName: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  postTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  postContent: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
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
});
