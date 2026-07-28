import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import {
  apiGetPosts,
  apiCreatePost,
  apiLikePost,
  apiDeletePost,
  apiGetComments,
  apiPostComment,
} from '../services/api';
import {
  MessageSquare,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Pin,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react-native';

const CATEGORIES = [
  'All Topics',
  'General',
  'Anime Discussion',
  'Recommendations',
  'Bug Reports',
  'Off-Topic',
];

const SpoilerText = ({ text }: { text: string }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <TouchableOpacity onPress={() => setRevealed(!revealed)} activeOpacity={0.8}>
      <Text style={[styles.postContent, !revealed && styles.spoilerHidden]}>
        {revealed ? text : 'Tap to reveal spoiler'}
      </Text>
    </TouchableOpacity>
  );
};

const PostContent = ({ content }: { content: string }) => {
  const parts = content.split(/(\|\|.*?\|\|)/g);
  return (
    <Text style={styles.postContent}>
      {parts.map((part, index) => {
        if (part.startsWith('||') && part.endsWith('||')) {
          return <SpoilerText key={index} text={part.slice(2, -2)} />;
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const CommentSection = ({ postId, isExpanded }: { postId: string; isExpanded: boolean }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (isExpanded) {
      loadComments();
    }
  }, [isExpanded]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await apiGetComments(`post-${postId}`, 0);
      setComments(res.data || []);
    } catch (err) {
      console.log('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !user) return;
    try {
      await apiPostComment({
        animeId: `post-${postId}`,
        episode: 0,
        content: commentText.trim(),
        authorName: user.username,
        authorAvatar: user.avatar,
      });
      setCommentText('');
      loadComments();
    } catch (err) {
      Alert.alert('Error', 'Failed to post comment');
    }
  };

  if (!isExpanded) return null;

  return (
    <View style={styles.commentsContainer}>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        comments.map((comment) => (
          <View key={comment.id || Math.random().toString()} style={styles.commentItem}>
            <Image source={{ uri: comment.avatar || 'https://via.placeholder.com/40' }} style={styles.commentAvatar} />
            <View style={styles.commentBody}>
              <Text style={styles.commentUsername}>{comment.username}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          </View>
        ))
      )}
      {user ? (
        <View style={styles.commentInputRow}>
          <Image source={{ uri: user.avatar || 'https://via.placeholder.com/40' }} style={styles.commentAvatar} />
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={COLORS.textMuted}
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity style={styles.commentButton} onPress={handlePostComment}>
            <Text style={styles.commentButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.loginPrompt}>Login to comment</Text>
      )}
    </View>
  );
};

export default function CommunityScreen() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All Topics');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Compose state
  const [isComposeExpanded, setIsComposeExpanded] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded posts
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const loadPosts = async () => {
    try {
      const categoryParam = activeCategory === 'All Topics' ? undefined : activeCategory;
      const res = await apiGetPosts(categoryParam);
      setPosts(res.data || []);
    } catch (err) {
      console.log('Error loading posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPosts();
  }, [activeCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts();
  }, [activeCategory]);

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Error', 'Title and content are required');
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      await apiCreatePost({
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory,
        authorName: user.username,
        authorAvatar: user.avatar,
      });
      setNewPostTitle('');
      setNewPostContent('');
      setIsComposeExpanded(false);
      loadPosts();
    } catch (err) {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'Login to like posts');
      return;
    }
    try {
      // Optimistic update
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === postId) {
            const isLiked = post.likes?.includes(user.username);
            return {
              ...post,
              likes: isLiked 
                ? post.likes.filter((u: string) => u !== user.username)
                : [...(post.likes || []), user.username],
              upvotes: isLiked ? (post.upvotes || 1) - 1 : (post.upvotes || 0) + 1
            };
          }
          return post;
        })
      );
      await apiLikePost(postId, user.username);
    } catch (err) {
      // Revert on error
      loadPosts();
    }
  };

  const handleDeletePost = async (postId: string, authorName: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDeletePost(postId, authorName, user?.role);
            loadPosts();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const insertSpoiler = () => {
    setNewPostContent(prev => prev + ' ||spoiler|| ');
  };

  const renderPost = ({ item }: { item: any }) => {
    const isLiked = user ? item.likes?.includes(user.username) : false;
    const canDelete = user && (user.role === 'ADMIN' || user.username === item.author?.name);
    const isExpanded = expandedPosts.has(item.id);

    return (
      <View style={styles.postCard}>
        {item.isPinned && (
          <View style={styles.pinnedBadge}>
            <Pin size={12} color={COLORS.primary} />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
        <View style={styles.postHeader}>
          <Image source={{ uri: item.author?.avatar || 'https://via.placeholder.com/40' }} style={styles.postAvatar} />
          <View style={styles.postMeta}>
            <View style={styles.authorRow}>
              <Text style={styles.postAuthor}>{item.author?.name || 'Unknown'}</Text>
              {item.author?.customTag && (
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>{item.author.customTag}</Text>
                </View>
              )}
            </View>
            <Text style={styles.postDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}</Text>
          </View>
          {canDelete && (
            <TouchableOpacity onPress={() => handleDeletePost(item.id, item.author?.name)}>
              <Trash2 size={20} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.postTitle}>{item.title}</Text>
        <PostContent content={item.content || ''} />

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>

        <View style={styles.postFooter}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLikePost(item.id)}>
            <ThumbsUp size={18} color={isLiked ? COLORS.primary : COLORS.textMuted} fill={isLiked ? COLORS.primary : 'transparent'} />
            <Text style={[styles.actionText, isLiked && { color: COLORS.primary }]}>{item.upvotes || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleLikePost(item.id)}>
            <ThumbsDown size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => toggleComments(item.id)}>
            <MessageSquare size={18} color={COLORS.textMuted} />
            <Text style={styles.actionText}>Comments</Text>
          </TouchableOpacity>
        </View>

        <CommentSection postId={item.id} isExpanded={isExpanded} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageSquare size={24} color={COLORS.primary} />
        <Text style={styles.headerTitle}>MyAniWatch Community</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContainer}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterPill, activeCategory === cat && styles.filterPillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {user ? (
        user.role === 'SUSPENDED' ? (
          <View style={styles.suspendedContainer}>
            <Text style={styles.suspendedText}>Your account is suspended. You cannot post.</Text>
          </View>
        ) : (
          <View style={styles.composeContainer}>
            {!isComposeExpanded ? (
              <TouchableOpacity style={styles.composePlaceholderRow} onPress={() => setIsComposeExpanded(true)}>
                <Image source={{ uri: user.avatar || 'https://via.placeholder.com/40' }} style={styles.composeAvatar} />
                <View style={styles.composePlaceholder}>
                  <Text style={styles.composePlaceholderText}>Start a discussion...</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.composeExpanded}>
                <View style={styles.composeHeaderRow}>
                  <Image source={{ uri: user.avatar || 'https://via.placeholder.com/40' }} style={styles.composeAvatar} />
                  <Text style={styles.composeUsername}>{user.username}</Text>
                  <TouchableOpacity onPress={() => setIsComposeExpanded(false)} style={styles.closeCompose}>
                    <ChevronUp size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.composeTitle}
                  placeholder="Post Title..."
                  placeholderTextColor={COLORS.textMuted}
                  value={newPostTitle}
                  onChangeText={setNewPostTitle}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelectScroll}>
                  {CATEGORIES.filter(c => c !== 'All Topics').map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catSelectPill, newPostCategory === cat && styles.catSelectPillActive]}
                      onPress={() => setNewPostCategory(cat)}
                    >
                      <Text style={[styles.catSelectText, newPostCategory === cat && styles.catSelectTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.composeContent}
                  placeholder="What's on your mind?..."
                  placeholderTextColor={COLORS.textMuted}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.composeActions}>
                  <TouchableOpacity style={styles.spoilerButton} onPress={insertSpoiler}>
                    <Text style={styles.spoilerButtonText}>+ Spoiler</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
                    onPress={handleCreatePost}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>Post</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )
      ) : (
        <View style={styles.loginPromptContainer}>
          <Text style={styles.loginPromptText}>Login to Post</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderPost}
          contentContainerStyle={styles.feedContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No posts found in this category.</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  filtersScroll: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  loginPromptContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  loginPromptText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  suspendedContainer: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  suspendedText: {
    color: COLORS.danger,
    fontWeight: '500',
  },
  composeContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  composePlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  composeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  composePlaceholder: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  composePlaceholderText: {
    color: COLORS.textMuted,
  },
  composeExpanded: {
    padding: 16,
  },
  composeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  composeUsername: {
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  closeCompose: {
    padding: 4,
  },
  composeTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  categorySelectScroll: {
    marginBottom: 12,
  },
  catSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  catSelectPillActive: {
    backgroundColor: COLORS.primaryLight,
  },
  catSelectText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  catSelectTextActive: {
    color: COLORS.primary,
  },
  composeContent: {
    color: COLORS.text,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 12,
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spoilerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
  },
  spoilerButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  feedContainer: {
    padding: 16,
    gap: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  pinnedText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  postMeta: {
    flex: 1,
    marginLeft: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAuthor: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 15,
  },
  tagBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  postDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  postTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  postContent: {
    color: COLORS.textDark,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  spoilerHidden: {
    backgroundColor: COLORS.surface,
    color: COLORS.surface,
    overflow: 'hidden',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
  },
  categoryBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  commentsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 16,
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  commentBody: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
  },
  commentUsername: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },
  commentText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  commentButton: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  commentButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  loginPrompt: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  }
});
