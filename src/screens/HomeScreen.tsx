import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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
import { DataProvider } from "../services";
import { useAuth } from "../contexts/AuthContext";
import { usePosts, useReactToPost, useUnreactToPost } from "../hooks/queries/usePosts";
import { useBatchMutualLikes } from "../hooks/queries/useMutualLikes";
 

const { width: screenWidth } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, profileId } = useAuth(); // Get profileId from AuthContext
  const [activeTab, setActiveTab] = useState<"recommended" | "following">(
    "recommended",
  );
  const [showPostModal, setShowPostModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [viewablePostIds, setViewablePostIds] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    setViewablePostIds(new Set(viewableItems.map((v) => v.item.id)));
  }).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20, // Lower threshold to keep videos loaded longer during scroll
    minimumViewTime: 100, // Minimum time item must be visible before being marked as viewable
  }).current;
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [textExceedsLines, setTextExceedsLines] = useState<Record<string, boolean>>({});

  // Use React Query for posts data fetching
  const {
    posts,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePosts({ type: activeTab, userId: profileId || undefined });

  // Extract unique user IDs from posts for batch mutual likes check
  const userIds = posts
    .map(post => post.user.id)
    .filter(id => id !== profileId && id !== process.env.EXPO_PUBLIC_TEST_USER_ID);
  
  const { mutualLikesMap } = useBatchMutualLikes(profileId || undefined, userIds);

  // Optimistic mutation hooks
  const reactMutation = useReactToPost();
  const unreactMutation = useUnreactToPost();
  
  
  // Scroll animation values - using native driver for smooth 60fps animation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Fixed heights for header components
  const headerBaseHeight = 47;
  const tabHeight = 56;
  const totalHeaderHeight = headerBaseHeight + insets.top + tabHeight;

  // Header opacity and transform - using only native-driver compatible properties
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 30, 80],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -(headerBaseHeight + insets.top)],
    extrapolate: "clamp",
  });

  const tabTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -tabHeight],
    extrapolate: "clamp",
  });

  // Handle scroll events with native driver for smooth animation
  const handleScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: true,
      }
    ),
    [scrollY]
  );

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
    return false;
  });

  // Note: Removed useFocusEffect refetch to reduce egress
  // Data is already cached with React Query and will refresh based on staleTime
  // Users can still pull-to-refresh manually when needed

  // Note: Removed AppState background sync to reduce egress
  // React Query's staleTime handles data freshness
  // Users can pull-to-refresh for immediate updates

  // Note: Disabled image preloading to reduce egress/bandwidth
  // expo-image's memory-disk caching handles this efficiently on-demand

  // Handle reaction with optimistic updates
  const handleReaction = useCallback(async (postId: string) => {
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    
    try {
      // Toggle reaction with optimistic update (UI updates immediately)
      if (post.hasReacted) {
        await unreactMutation.mutateAsync({ postId, userId: currentUserId });
      } else {
        await reactMutation.mutateAsync({ postId, userId: currentUserId });
      }
    } catch (error) {
      console.error("Failed to react to post:", error);
      // Error is automatically handled by mutation's onError (rollback)
    }
  }, [profileId, posts, reactMutation, unreactMutation]);

  // const handleComment = (postId: string) => {
  //   console.log('Comment on post:', postId);
  //   // TODO: Navigate to comments
  // };

  const handleViewProfile = useCallback((userId: string) => {
    console.log("View profile:", userId);
    navigation.navigate("Profile", { userId });
  }, [navigation]);

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

  const handleImagePress = useCallback((images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  }, []);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Prefetch next page when user reaches 80% of current content
  const handlePrefetch = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      // Prefetch silently in background
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


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
    aspectRatio?: number;
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
          // Refetch posts to update with new data
          await refetch();
        }
        setSelectedPost(null);
      } else {
        // Create new post with actual user ID
        const response = await DataProvider.createPostWithData({
          text: postData.text,
          images: postData.images,
          videos: postData.videos,
          userId: currentUserId,
          aspectRatio: postData.aspectRatio,
        });

        if (response.error) {
          console.error("Failed to create post:", response.error);
          throw new Error(response.error);
        }

        if (response.data) {
          // Refetch posts to show new post
          await refetch();
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
        // Refetch posts to remove deleted post
        await refetch();
        console.log("Post deleted successfully:", postId);
      } else {
        Alert.alert("エラー", result.error || "投稿の削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      Alert.alert("エラー", "投稿の削除中にエラーが発生しました");
    }
  };

  const handleToggleExpand = useCallback((postId: string) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }, []);

  const handleTextLayout = (postId: string, event: any) => {
    const { lines } = event.nativeEvent;
    // When numberOfLines is set, we need to check if text was truncated
    // If lines array has exactly 3 lines and the last line is truncated, text exceeds 3 lines
    if (lines && lines.length === 3) {
      const lastLine = lines[lines.length - 1];
      // Check if the last line is truncated (ends with ellipsis or is at max width)
      // We'll also check by measuring if there's more content
      if (lastLine && lastLine.text) {
        // If we have 3 lines, check if there's more content by comparing
        // the total text length with what's visible in 3 lines
        const visibleText = lines.map((line: any) => line.text).join('');
        const post = posts.find(p => p.id === postId);
        if (post && post.content && post.content.length > visibleText.length) {
          setTextExceedsLines((prev) => ({
            ...prev,
            [postId]: true,
          }));
        }
      }
    } else if (lines && lines.length > 3) {
      // If we somehow get more than 3 lines (shouldn't happen with numberOfLines={3})
      setTextExceedsLines((prev) => ({
        ...prev,
        [postId]: true,
      }));
    }
  };

  const renderPost = useCallback(({ item, index }: { item: Post; index: number }) => {
    const isTextOnly = item.images.length === 0 && item.videos?.length === 0;
    const isExpanded = expandedPosts[item.id] || false;
    // Also check if text is long enough to likely exceed 3 lines (rough estimate: ~90-120 chars)
    // This is a fallback in case onTextLayout doesn't fire correctly
    const likelyExceedsLines = item.content && item.content.length > 90;
    const exceedsLines = textExceedsLines[item.id] || likelyExceedsLines;
    const showMoreButton = exceedsLines && !isExpanded && item.content;

    return (
      <View style={styles.postCard}>
        {/* Content and header section with padding */}
        <View style={styles.postContentSection}>
          {/* Profile Header - Show for all posts */}
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => handleViewProfile(item.user.id)}
            >
            <ExpoImage
              source={{ uri: item.user.profile_pictures[0] }}
              style={styles.profileImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              accessibilityLabel={`${item.user.name}のプロフィール写真`}
            />
              <View style={styles.userDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.username}>{item.user.name}</Text>
                  {item.user.is_verified && (
                    <View style={styles.verificationPill}>
                      <Ionicons name="shield-checkmark" size={12} color={Colors.white} />
                      <Text style={styles.verificationText}>認証済み</Text>
                    </View>
                  )}
                  {item.user.is_premium && (
                    <View style={styles.premiumPill}>
                      <Ionicons name="diamond" size={12} color={Colors.white} />
                      <Text style={styles.premiumText}>会員</Text>
                    </View>
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

          {/* Post Content - Show for all posts */}
          {item.content && (
            <View style={styles.postContentContainer}>
              <Text
                style={styles.postContent}
                numberOfLines={isExpanded ? undefined : 3}
                onTextLayout={!isExpanded && (item.content?.length ?? 0) >= 80 && (item.content?.length ?? 0) <= 140 ? (event) => handleTextLayout(item.id, event) : undefined}
              >
                {item.content}
              </Text>
              {showMoreButton && (
                <TouchableOpacity
                  onPress={() => handleToggleExpand(item.id)}
                  activeOpacity={0.7}
                  style={styles.expandButton}
                >
                  <Text style={styles.moreLink}>もっと見る</Text>
                </TouchableOpacity>
              )}
              {isExpanded && exceedsLines && (
                <TouchableOpacity
                  onPress={() => handleToggleExpand(item.id)}
                  activeOpacity={0.7}
                  style={styles.expandButton}
                >
                  <Text style={styles.moreLink}>折りたたむ</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Post Images - Full width, no padding */}
        {item.images.length > 0 && (
          <ImageCarousel
            images={item.images}
            fullWidth={true}
            style={styles.imageCarouselFullWidth}
            aspectRatio={item.aspect_ratio}
            onImagePress={(imageIndex) => handleImagePress(item.images, imageIndex)}
          />
        )}

        {/* Post Videos - Always render container for layout stability */}
        {item.videos && item.videos.length > 0 && (() => {
          const validVideos = item.videos.filter((video) => {
            if (!video || typeof video !== "string" || video.trim() === "") return false;
            if (video.startsWith("file://")) return false;
            return true;
          });
          if (validVideos.length === 0) return null;

          // Calculate height based on aspect ratio for stable layout
          const aspectRatio = item.aspect_ratio || (9 / 16); // Default to portrait
          const videoHeight = screenWidth / aspectRatio;
          const isVisible = viewablePostIds.has(item.id);

          return (
            <View style={styles.videoContainer}>
              {validVideos.map((video, index) => (
                <View
                  key={index}
                  style={[
                    styles.videoItem,
                    { height: videoHeight, backgroundColor: Colors.black }
                  ]}
                >
                  {isVisible ? (
                    <VideoPlayer
                      videoUri={video}
                      style={styles.videoPlayer}
                      aspectRatio={item.aspect_ratio}
                    />
                  ) : (
                    <View style={styles.videoPlaceholder} />
                  )}
                </View>
              ))}
            </View>
          );
        })()}

        {/* Post Actions - With padding */}
        <View style={styles.postActionsSection}>
          <View style={styles.postActions}>
            {/* Reaction button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReaction(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.hasReacted ? "リアクションを取り消し" : "リアクション"}
            >
              <View style={styles.heartIconContainer}>
                <Ionicons
                  name={item.hasReacted ? "heart" : "heart-outline"}
                  size={20}
                  color={item.hasReacted ? "#EF4444" : Colors.gray[600]}
                />
              </View>
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
                <Image
                  source={require('../../assets/images/Icons/message.png')}
                  style={[
                    styles.messageIcon,
                    !mutualLikesMap[item.user.id] && styles.disabledMessageIcon
                  ]}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.actionText,
                  !mutualLikesMap[item.user.id] && styles.disabledActionText
                ]}>
                  メッセージ
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [expandedPosts, textExceedsLines, mutualLikesMap, profileId, viewablePostIds, handleViewProfile, handleReaction, handleMessage, handleImagePress, handleToggleExpand, handleTextLayout]);

  if (isLoading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <Loading text="フィードを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.statusBarOverlay,
          {
            height: insets.top,
            opacity: headerOpacity,
          },
        ]}
      />

      {/* Header - Fixed height with transform animation */}
      <Animated.View
        style={[
          styles.header,
          {
            height: headerBaseHeight + insets.top,
            paddingTop: insets.top,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/Icons/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowPostModal(true)}
          accessibilityRole="button"
          accessibilityLabel="新しい投稿を作成"
          accessibilityHint="投稿作成画面を開きます"
        >
          <View style={styles.addButtonCircle}>
            <Image
              source={require('../../assets/images/Icons/Add-Outline.png')}
              style={styles.addIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Tab Selector - Fixed height with transform animation */}
      <Animated.View
        style={[
          styles.tabContainer,
          {
            top: headerBaseHeight + insets.top,
            height: tabHeight,
            opacity: headerOpacity,
            transform: [{ translateY: tabTranslateY }],
          }
        ]}
      >
        <View style={styles.tabPillContainer}>
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
      </Animated.View>

      {/* Feed - Using Animated.FlatList for native driver scroll events */}
      <Animated.FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        extraData={viewablePostIds}
        contentContainerStyle={[styles.feedContainer, { paddingTop: totalHeaderHeight }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        scrollIndicatorInsets={{ top: totalHeaderHeight, bottom: 0 }}
        showsVerticalScrollIndicator={false}
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        onMomentumScrollEnd={handlePrefetch}
        removeClippedSubviews={Platform.OS === 'android'} // Only on Android to avoid iOS issues
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={11} // Larger window for smoother scrolling
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          isLoading ? (
            <Loading />
          ) : (
            <EmptyState
              icon="home-outline"
              title="フィードが空です"
              subtitle="新しい投稿を待っています"
              buttonTitle="プロフィールを探す"
              onButtonPress={() => console.log("Go to search")}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: Spacing.md }}>
              <Loading />
            </View>
          ) : null
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  tabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 9,
  },
  statusBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    zIndex: 20,
  },
  tabPillContainer: {
    flexDirection: "row",
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: Typography.getFontFamily("500"),
    color: Colors.gray[500],
    textAlign: "center",
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
    textAlign: "center",
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  headerButton: {
    padding: 0,
  },
  addButtonCircle: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    width: 20,
    height: 20,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 102,
    height: 27.728,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.black,
    marginLeft: 4,
  },
  feedContainer: {
    paddingTop: 0,
    paddingBottom: Spacing.xl * 3,
    flexGrow: 1,
  },
  postCard: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    backgroundColor: Colors.white,
  },
  postContentSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  textOnlyPostCard: {
    minHeight: "auto",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    marginRight: 10,
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
  postContentContainer: {
    marginBottom: Spacing.sm,
  },
  postContent: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.black,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    flex: 0,
  },
  expandButton: {
    marginTop: Spacing.xs,
    alignSelf: "flex-start",
  },
  moreLink: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.gray[500],
  },
  imageCarousel: {
    marginTop: Spacing.sm,
  },
  imageCarouselFullWidth: {
    marginTop: 0,
    marginHorizontal: 0,
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
  videoPlaceholder: {
    flex: 1,
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.md,
  },
  postActionsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: Spacing.md,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 32,
  },
  heartIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  messageIcon: {
    width: 20,
    height: 20,
  },
  disabledMessageIcon: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.gray[500],
    marginLeft: 4,
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
  verificationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(32,178,170,0.85)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  verificationText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.white,
    marginLeft: 4,
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(218,165,32,0.9)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  premiumText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.white,
    marginLeft: 4,
  },
  shareButton: {
    padding: Spacing.xs,
  },
  statusBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 49,
    zIndex: 0,
  },
  statusBarBackgroundImage: {
    width: "100%",
    height: "100%",
  },
});

export default HomeScreen;

