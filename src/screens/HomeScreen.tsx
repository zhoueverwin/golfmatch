import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useBackHandler } from "../hooks/useBackHandler";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { Post } from "../types/dataModels";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import ImageCarousel from "../components/ImageCarousel";
import PostCreationModal from "../components/PostCreationModal";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import VideoPlayer from "../components/VideoPlayer";
import FullscreenVideoPlayer from "../components/FullscreenVideoPlayer";
import { DataProvider } from "../services";
import { useAuth } from "../contexts/AuthContext";

// const { width } = Dimensions.get('window'); // Unused for now

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, profileId } = useAuth(); // Get profileId from AuthContext
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommended" | "following">(
    "recommended",
  );
  const [showPostModal, setShowPostModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoUri, setFullscreenVideoUri] = useState<string>("");
  const [mutualLikesMap, setMutualLikesMap] = useState<Record<string, boolean>>({});

  // Handle Android back button
  useBackHandler(() => {
    if (showPostModal) {
      setShowPostModal(false);
      return true;
    }
    if (showImageViewer) {
      setShowImageViewer(false);
      return true;
    }
    if (showFullscreenVideo) {
      setShowFullscreenVideo(false);
      return true;
    }
    return false;
  });

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  // Refresh posts when screen comes into focus (e.g., after creating a new post)
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [activeTab]),
  );

  const loadPosts = async () => {
    try {
      setLoading(true);

      // Add a small delay to show loading state (optional)
      const [response] = await Promise.all([
        activeTab === "recommended"
          ? DataProvider.getRecommendedPosts(1, 20) // Increase limit for better UX
          : DataProvider.getFollowingPosts(1, 20),
        new Promise((resolve) => setTimeout(resolve, 100)), // Minimum loading time
      ]);

      if (response.error) {
        console.error("Failed to load posts:", response.error);
        setPosts([]);
      } else {
        const postsData = (response.data as unknown as Post[]) || [];
        setPosts(postsData);
        
        // Check mutual likes for all posts
        await checkMutualLikesForPosts(postsData);
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const checkMutualLikesForPosts = async (posts: Post[]) => {
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (!currentUserId) return;

    const mutualLikesPromises = posts
      .filter(post => post.user.id !== currentUserId)
      .map(async (post) => {
        try {
          const response = await DataProvider.checkMutualLikes(currentUserId, post.user.id);
          return {
            userId: post.user.id,
            hasMutualLikes: response.success && response.data
          };
        } catch (error) {
          console.error(`Error checking mutual likes for user ${post.user.id}:`, error);
          return {
            userId: post.user.id,
            hasMutualLikes: false
          };
        }
      });

    const results = await Promise.all(mutualLikesPromises);
    const newMutualLikesMap: Record<string, boolean> = {};
    
    results.forEach(result => {
      newMutualLikesMap[result.userId] = result.hasMutualLikes ?? false;
    });

    setMutualLikesMap(newMutualLikesMap);
  };

  // New: Handle reaction (replaces like/super like for posts)
  const handleReaction = async (postId: string) => {
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    
    try {
      // Toggle reaction (thumbs-up)
      if (post.hasReacted) {
        await DataProvider.unreactToPost(postId, currentUserId);
      } else {
        await DataProvider.reactToPost(postId, currentUserId);
      }
      
      // Optimistically update UI
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                hasReacted: !p.hasReacted,
                reactions_count: p.hasReacted 
                  ? Math.max(0, (p.reactions_count || 0) - 1)
                  : (p.reactions_count || 0) + 1,
                // Update legacy fields for backward compatibility
                isLiked: !p.hasReacted,
                likes: p.hasReacted 
                  ? Math.max(0, p.likes - 1)
                  : p.likes + 1,
              }
            : p,
        ),
      );
    } catch (error) {
      console.error("Failed to react to post:", error);
    }
  };

  // const handleComment = (postId: string) => {
  //   console.log('Comment on post:', postId);
  //   // TODO: Navigate to comments
  // };

  const handleViewProfile = (userId: string) => {
    console.log("View profile:", userId);
    navigation.navigate("Profile", { userId });
  };

  const handleMessage = async (
    userId: string,
    userName: string,
    userImage: string,
  ) => {
    console.log("Message user:", userId);
    
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (!currentUserId) return;

    try {
      // Check if users have mutual likes
      const mutualLikesResponse = await DataProvider.checkMutualLikes(currentUserId, userId);
      
      if (!mutualLikesResponse.success || !mutualLikesResponse.data) {
        Alert.alert(
          "メッセージを送信できません",
          "お互いにいいねを送る必要があります。まず相手のプロフィールをいいねしてください。",
          [{ text: "OK" }]
        );
        return;
      }

      // Get or create chat between the two users
      const chatResponse = await DataProvider.getOrCreateChatBetweenUsers(
        currentUserId,
        userId
      );
      
      if (chatResponse.success && chatResponse.data) {
        // Navigate directly to the specific chat
        navigation.navigate("Chat", {
          chatId: chatResponse.data,
          userId,
          userName,
          userImage,
        });
      } else {
        Alert.alert("エラー", "チャットの作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to handle message:", error);
      Alert.alert("エラー", "メッセージ機能でエラーが発生しました");
    }
  };

  const handleImagePress = (images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleFullscreenVideoRequest = (videoUri: string) => {
    setFullscreenVideoUri(videoUri);
    setShowFullscreenVideo(true);
  };

  const handlePostMenu = (post: Post) => {
    Alert.alert("投稿の管理", "操作を選択してください", [
      {
        text: "編集",
        onPress: () => handleEditPost(post),
      },
      {
        text: "削除",
        style: "destructive",
        onPress: () => handleDeletePost(post.id),
      },
      {
        text: "キャンセル",
        style: "cancel",
      },
    ]);
  };

  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  const handleCreatePost = async (postData: {
    text: string;
    images: string[];
    videos: string[];
  }) => {
    try {
      // Get actual user ID from AuthContext profileId
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      
      if (!currentUserId) {
        console.error("No authenticated user found");
        throw new Error("Please sign in to create posts");
      }

      console.log('Creating post with user ID:', currentUserId);

      if (selectedPost) {
        // Update existing post using DataProvider
        const response = await DataProvider.updatePost(selectedPost.id, {
          images: postData.images,
          videos: postData.videos,
        });

        if (response.error) {
          console.error("Failed to update post:", response.error);
          throw new Error(response.error);
        }

        if (response.data) {
          // Update local state with the updated post
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === selectedPost.id ? response.data! : post,
            ),
          );
        }
        setSelectedPost(null);
      } else {
        // Create new post with actual user ID
        const response = await DataProvider.createPostWithData({
          ...postData,
          userId: currentUserId,
        });

        if (response.error) {
          console.error("Failed to create post:", response.error);
          throw new Error(response.error);
        }

        if (response.data) {
          // Add to top of posts
          setPosts((prevPosts) => [response.data!, ...prevPosts]);
          console.log('Post created successfully:', response.data.id);
        }
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      console.error("Error creating/updating post:", error);
      throw error;
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "投稿を削除",
      "この投稿を削除してもよろしいですか？この操作は元に戻せません。",
      [
        {
          text: "キャンセル",
          style: "cancel",
        },
        {
          text: "削除",
          style: "destructive",
          onPress: () => confirmDeletePost(postId),
        },
      ],
    );
  };

  const confirmDeletePost = async (postId: string) => {
    try {
      if (!profileId) {
        Alert.alert("エラー", "ユーザー情報が見つかりません");
        return;
      }

      // Call the API to delete from database
      const result = await DataProvider.deletePost(postId, profileId);
      
      if (result.success) {
        // Remove from local state only after successful database deletion
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
        console.log("Post deleted successfully:", postId);
      } else {
        Alert.alert("エラー", result.error || "投稿の削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      Alert.alert("エラー", "投稿の削除中にエラーが発生しました");
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isTextOnly = item.images.length === 0 && item.videos?.length === 0;

    return (
      <Card
        style={[styles.postCard, isTextOnly && styles.textOnlyPostCard]}
        shadow="small"
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => handleViewProfile(item.user.id)}
          >
            <Image
              source={{ uri: item.user.profile_pictures[0] }}
              style={styles.profileImage}
              accessibilityLabel={`${item.user.name}のプロフィール写真`}
            />
            <View style={styles.userDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{item.user.name}</Text>
                {item.user.is_verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.primary}
                  />
                )}
              </View>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>
          </TouchableOpacity>

          {/* Three-dot menu for post management (only for user's own posts) */}
          {item.user.id === (profileId || process.env.EXPO_PUBLIC_TEST_USER_ID) && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => handlePostMenu(item)}
              accessibilityRole="button"
              accessibilityLabel="投稿のメニューを開く"
              accessibilityHint="投稿の編集や削除などの操作ができます"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={Colors.gray[600]}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Content */}
        {item.content && <Text style={styles.postContent}>{item.content}</Text>}

        {/* Post Images */}
        {item.images.length > 0 && (
          <ImageCarousel
            images={item.images}
            style={styles.imageCarousel}
            onImagePress={(index) => handleImagePress(item.images, index)}
          />
        )}

        {/* Post Videos */}
        {item.videos && item.videos.length > 0 && (
          <View style={styles.videoContainer}>
            {item.videos
              .filter((video) => {
                // Filter out invalid videos
                if (!video || typeof video !== "string" || video.trim() === "") {
                  return false;
                }
                // Filter out local file paths (not uploaded to server)
                if (video.startsWith("file://")) {
                  console.warn(`[HomeScreen] Skipping local file path: ${video.substring(0, 50)}...`);
                  return false;
                }
                return true;
              })
              .map((video, index) => (
                <View key={index} style={styles.videoItem}>
                  <VideoPlayer
                    videoUri={video}
                    style={styles.videoPlayer}
                    onFullscreenRequest={() =>
                      handleFullscreenVideoRequest(video)
                    }
                  />
                </View>
              ))}
          </View>
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <View style={styles.actionButtons}>
            {/* Reaction button (replaces like in おすすめ tab, shows in both tabs) */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReaction(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.hasReacted ? "リアクションを取り消し" : "リアクション"}
            >
              <Ionicons
                name={item.hasReacted ? "thumbs-up" : "thumbs-up-outline"}
                size={24}
                color={item.hasReacted ? Colors.primary : Colors.gray[600]}
              />
              <Text style={styles.actionText}>{item.reactions_count || item.likes || 0}</Text>
            </TouchableOpacity>

            {/* Message button - only show for other users' posts */}
            {item.user.id !== (profileId || process.env.EXPO_PUBLIC_TEST_USER_ID) && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  !mutualLikesMap[item.user.id] && styles.disabledActionButton
                ]}
                onPress={() => {
                  if (mutualLikesMap[item.user.id]) {
                    handleMessage(
                      item.user.id,
                      item.user.name,
                      item.user.profile_pictures[0],
                    );
                  } else {
                    Alert.alert(
                      "メッセージを送信できません",
                      "お互いにいいねを送る必要があります。まず相手のプロフィールをいいねしてください。",
                      [{ text: "OK" }]
                    );
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  mutualLikesMap[item.user.id] 
                    ? "メッセージ" 
                    : "メッセージ（お互いにいいねが必要）"
                }
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={
                    mutualLikesMap[item.user.id] 
                      ? Colors.gray[600] 
                      : Colors.gray[400]
                  }
                />
                <Text style={[
                  styles.actionText,
                  !mutualLikesMap[item.user.id] && styles.disabledActionText
                ]}>
                  {mutualLikesMap[item.user.id] ? "メッセージ" : "メッセージを送る"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading text="フィードを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Ionicons name="golf" size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>GolfMatch</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowPostModal(true)}
          accessibilityRole="button"
          accessibilityLabel="新しい投稿を作成"
          accessibilityHint="投稿作成画面を開きます"
        >
          <Ionicons name="add" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "recommended" && styles.activeTab]}
          onPress={() => setActiveTab("recommended")}
          accessibilityRole="tab"
          accessibilityLabel="おすすめの投稿を表示"
          accessibilityState={{ selected: activeTab === "recommended" }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "recommended" && styles.activeTabText,
            ]}
          >
            おすすめ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
          accessibilityRole="tab"
          accessibilityLabel="フォロー中の投稿を表示"
          accessibilityState={{ selected: activeTab === "following" }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "following" && styles.activeTabText,
            ]}
          >
            フォロー中
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="home-outline"
            title="フィードが空です"
            subtitle="新しい投稿を待っています"
            buttonTitle="プロフィールを探す"
            onButtonPress={() => console.log("Go to search")}
          />
        }
      />

      {/* Post Creation Modal */}
      <PostCreationModal
        visible={showPostModal}
        onClose={() => {
          setShowPostModal(false);
          setSelectedPost(null);
        }}
        onPublish={handleCreatePost}
        editingPost={
          selectedPost
            ? {
                text: selectedPost.content,
                images: selectedPost.images,
                videos: selectedPost.videos || [],
              }
            : null
        }
      />

      {/* Fullscreen Image Viewer */}
      <FullscreenImageViewer
        visible={showImageViewer}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Fullscreen Video Player */}
      <FullscreenVideoPlayer
        visible={showFullscreenVideo}
        videoUri={fullscreenVideoUri}
        onClose={() => setShowFullscreenVideo(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: Typography.getFontFamily("500"),
    color: Colors.gray[600],
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginLeft: Spacing.xs,
  },
  feedContainer: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  postCard: {
    marginBottom: Spacing.md,
  },
  textOnlyPostCard: {
    minHeight: "auto",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginRight: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  moreButton: {
    padding: Spacing.sm,
  },
  postContent: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    marginBottom: Spacing.md,
  },
  imageCarousel: {
    marginTop: Spacing.sm,
  },
  videoContainer: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  videoItem: {
    width: "100%",
    marginBottom: Spacing.sm,
  },
  videoPlayer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.lg,
    padding: Spacing.xs,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  disabledActionText: {
    color: Colors.gray[400],
  },
  femaleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success + "15",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  femaleBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.success,
    marginLeft: 2,
  },
  shareButton: {
    padding: Spacing.xs,
  },
});

export default HomeScreen;
