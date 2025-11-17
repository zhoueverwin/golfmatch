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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useScroll } from "../contexts/ScrollContext";

// const { width } = Dimensions.get('window'); // Unused for now

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
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
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [textExceedsLines, setTextExceedsLines] = useState<Record<string, boolean>>({});
  
  // Get navigation bar opacity setter from context
  const { setNavBarOpacity } = useScroll();
  
  // Scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastOpacityUpdate = useRef(1);
  const opacityUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Header opacity: fade out when scrolling up (starts at 50px, complete at 100px)
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  const headerBaseHeight = 47;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [headerBaseHeight + insets.top, headerBaseHeight + insets.top, 0],
    extrapolate: "clamp",
  });

  const headerPaddingTop = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [insets.top, insets.top, 0],
    extrapolate: "clamp",
  });
  const tabContainerHeight = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [56, 56, 0],
    extrapolate: 'clamp',
  });
  const tabBorderWidth = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });
  
  // Navigation bar opacity: becomes semi-transparent when scrolling up (starts at 20px)
  // Returns to full opacity when scrolling down
  // We'll update this directly in the scroll listener
  useEffect(() => {
    // Set initial value
    setNavBarOpacity(1);
  }, [setNavBarOpacity]);
  
  // Handle scroll events with debouncing and direction-based animation
  const handleScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: false, // opacity animations can use native driver
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const currentScrollY = event.nativeEvent.contentOffset.y;
          const direction = currentScrollY > lastScrollY.current ? 'up' : 'down';
          scrollDirection.current = direction;
          lastScrollY.current = currentScrollY;
          
          // Update navigation bar opacity directly based on scroll position
          let navOpacity = 1;
          if (currentScrollY >= 100) {
            navOpacity = 0;
          } else if (currentScrollY > 20) {
            // Smooth transition between 20px and 100px
            navOpacity = 1 - ((currentScrollY - 20) / 80);
          }
          
          // Update opacity immediately for responsive feel
          const opacityDiff = Math.abs(navOpacity - lastOpacityUpdate.current);
          if (opacityDiff > 0.01) { // Only update if changed by more than 1%
            lastOpacityUpdate.current = navOpacity;
            
            // Clear any pending update
            if (opacityUpdateTimeout.current) {
              clearTimeout(opacityUpdateTimeout.current);
            }
            
            // Update immediately without delay for better responsiveness
            setNavBarOpacity(navOpacity);
          }
          
          // Debounce: clear existing timeout
          if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
          }
          
          // Set timeout to handle scroll stop
          scrollTimeout.current = setTimeout(() => {
            // When scrolling stops, if scrolled down and near top, reset to full opacity
            if (direction === 'down' && currentScrollY < 20) {
              Animated.timing(scrollY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start();
              setNavBarOpacity(1);
            }
          }, 100);
        },
      }
    ),
    [setNavBarOpacity]
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

  const handleToggleExpand = (postId: string) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleTextLayout = (postId: string, event: any) => {
    const { lines } = event.nativeEvent;
    // When numberOfLines is set, we need to check if text was truncated
    // If lines array has exactly 2 lines and the last line is truncated, text exceeds 2 lines
    if (lines && lines.length === 2) {
      const lastLine = lines[lines.length - 1];
      // Check if the last line is truncated (ends with ellipsis or is at max width)
      // We'll also check by measuring if there's more content
      if (lastLine && lastLine.text) {
        // If we have 2 lines, check if there's more content by comparing
        // the total text length with what's visible in 2 lines
        const visibleText = lines.map((line: any) => line.text).join('');
        const post = posts.find(p => p.id === postId);
        if (post && post.content && post.content.length > visibleText.length) {
          setTextExceedsLines((prev) => ({
            ...prev,
            [postId]: true,
          }));
        }
      }
    } else if (lines && lines.length > 2) {
      // If we somehow get more than 2 lines (shouldn't happen with numberOfLines={2})
      setTextExceedsLines((prev) => ({
        ...prev,
        [postId]: true,
      }));
    }
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    const isTextOnly = item.images.length === 0 && item.videos?.length === 0;
    const isExpanded = expandedPosts[item.id] || false;
    // Also check if text is long enough to likely exceed 2 lines (rough estimate: ~60-80 chars)
    // This is a fallback in case onTextLayout doesn't fire correctly
    const likelyExceedsLines = item.content && item.content.length > 60;
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

          {/* Post Content - Show for all posts */}
          {item.content && (
            <View style={styles.postContentContainer}>
              <Text
                style={styles.postContent}
                numberOfLines={isExpanded ? undefined : 2}
                onTextLayout={(event) => {
                  if (!isExpanded) {
                    handleTextLayout(item.id, event);
                  }
                }}
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
            onImagePress={(imageIndex) => handleImagePress(item.images, imageIndex)}
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
              <Ionicons
                name={item.hasReacted ? "heart" : "heart-outline"}
                size={20}
                color={item.hasReacted ? "#EF4444" : Colors.gray[600]}
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
  };

  if (loading) {
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
            height: headerPaddingTop,
            opacity: headerOpacity,
          },
        ]}
      />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            height: headerHeight,
            paddingTop: headerPaddingTop,
            overflow: "hidden",
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

      {/* Tab Selector */}
      <Animated.View 
        style={[
          styles.tabContainer, 
          { 
            opacity: headerOpacity,
            height: tabContainerHeight,
            borderBottomWidth: tabBorderWidth,
            overflow: 'hidden',
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

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        scrollIndicatorInsets={{ top: 0, bottom: 0 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    // height is animated, so don't set fixed height here
  },
  tabContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
    // height is animated, so don't set fixed height here
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
