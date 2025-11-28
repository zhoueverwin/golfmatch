import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useRoute,
  useNavigation,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { UserProfile, CalendarData, Post } from "../types/dataModels";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import GolfCalendar from "../components/GolfCalendar";
import ImageCarousel from "../components/ImageCarousel";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import VideoPlayer from "../components/VideoPlayer";
import { DataProvider } from "../services";
import { getProfilePicture, getValidProfilePictures } from "../constants/defaults";
import { UserActivityService } from "../services/userActivityService";
import { supabaseDataProvider } from "../services/supabaseDataProvider";
import { membershipService } from "../services/membershipService";
import { useProfile } from "../hooks/queries/useProfile";
import { useUserPosts } from "../hooks/queries/usePosts";

const { width } = Dimensions.get("window");

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;
type UserProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const UserProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { userId } = route.params;
  const { profileId } = useAuth(); // Get current user's profile ID

  // Use React Query hooks for data fetching
  const { profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile(userId);
  const {
    posts,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPosts,
  } = useUserPosts(userId);

  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [mutualLikesMap, setMutualLikesMap] = useState<Record<string, boolean>>({});
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoUri, setFullscreenVideoUri] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [textExceedsLines, setTextExceedsLines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadCalendarData(),
        checkIfLiked(),
        trackProfileView(),
        loadOnlineStatus(),
      ]);
    };
    
    loadAllData();
  }, [userId]);

  // Load online status for the profile user
  const loadOnlineStatus = async () => {
    try {
      const response = await supabaseDataProvider.getUserOnlineStatus(userId);
      if (response.success && response.data) {
        setIsOnline(response.data.isOnline);
        setLastActiveAt(response.data.lastActiveAt);
      }
    } catch (error) {
      console.error("[UserProfileScreen] Error loading online status:", error);
    }
  };

  // Format last active time for display
  const formatLastActive = (timestamp: string | null): string => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    }
  };

  // Track profile view when user views someone's profile
  const trackProfileView = async () => {
    try {
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      
      if (!currentUserId) {
        console.log('[UserProfileScreen] No current user ID, skipping tracking');
        return;
      }

      // Don't track if viewing own profile
      if (userId === currentUserId) {
        console.log('[UserProfileScreen] Viewing own profile, skipping tracking');
        return;
      }

      console.log(`[UserProfileScreen] Tracking profile view: ${currentUserId} -> ${userId}`);
      await UserActivityService.trackProfileView(currentUserId, userId);
    } catch (error) {
      console.error('[UserProfileScreen] Error tracking profile view:', error);
      // Don't block UI if tracking fails
    }
  };

  // Check mutual likes when posts change
  useEffect(() => {
    if (posts.length > 0) {
      checkMutualLikesForPosts(posts);
    }
  }, [posts]);

  // Refresh posts and calendar when screen comes into focus (e.g., after creating a new post or editing calendar)
  useFocusEffect(
    useCallback(() => {
      // Check if viewing own profile
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (userId === currentUserId) {
        // Only refresh posts and calendar for current user (My Page)
        refetchPosts();
        loadCalendarData();
      }
    }, [userId, profileId]),
  );

  const loadCalendarData = async (year?: number, month?: number) => {
    try {
      const response = await DataProvider.getCalendarData(
        userId,
        year || currentYear,
        month || currentMonth,
      );
      if (response.error) {
        console.error("Failed to load calendar:", response.error);
      } else {
        setCalendarData(response.data || null);
      }
    } catch (_error) {
      console.error("Error loading calendar:", _error);
    }
  };

  const handleMonthChange = async (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    await loadCalendarData(year, month);
  };

  const handleImagePress = (images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleFullscreenVideoRequest = (videoUri: string) => {
    setFullscreenVideoUri(videoUri);
    setShowFullscreenVideo(true);
  };

  const handleLoadMorePosts = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
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

  const checkIfLiked = async () => {
    try {
      // Get current user ID from AuthContext
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;

      if (!currentUserId) {
        setIsLiked(false);
        return;
      }

      if (userId === currentUserId) {
        setIsLiked(false); // Can't like yourself
        return;
      }

      const response = await DataProvider.getUserInteractions(currentUserId);
      if (response.data) {
        const hasLiked = response.data.some(
          (interaction) =>
            interaction.liked_user_id === userId && interaction.type === "like",
        );
        setIsLiked(hasLiked);
      } else {
        setIsLiked(false);
      }
    } catch (_error) {
      console.error("Error checking like status:", _error);
      setIsLiked(false);
    }
  };

  const handleLike = async () => {
    if (isLoadingLike || isLiked) return;

    setIsLoadingLike(true);
    try {
      // Get current user ID from AuthContext
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;

      if (!currentUserId) {
        Alert.alert("Error", "Please sign in to like profiles");
        setIsLoadingLike(false);
        return;
      }

      if (userId === currentUserId) {
        console.log("Cannot like yourself");
        return;
      }

      const response = await DataProvider.likeUser(currentUserId, userId);
      if (response.error) {
        console.error("Failed to like user:", response.error);
      } else {
        setIsLiked(true);
        console.log("Successfully liked user:", userId);
      }
    } catch (_error) {
      console.error("Error liking user:", _error);
    } finally {
      setIsLoadingLike(false);
    }
  };

  const handleMessage = async (postUserId?: string, postUserName?: string, postUserImage?: string) => {
    const targetUserId = postUserId || userId;
    const targetUserName = postUserName || profile?.basic?.name || 'ユーザー';
    const targetUserImage = postUserImage || getProfilePicture(profile?.profile_pictures, 0);
    
    if (!targetUserName || !targetUserImage) return;
    
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (!currentUserId) return;

    try {
      // Check if users have mutual likes
      const mutualLikesResponse = await DataProvider.checkMutualLikes(currentUserId, targetUserId);
      
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
        targetUserId
      );
      
      if (chatResponse.success && chatResponse.data) {
        // Navigate directly to the specific chat
        navigation.navigate("Chat", {
          chatId: chatResponse.data,
          userId: targetUserId,
          userName: targetUserName,
          userImage: targetUserImage,
        });
      } else {
        Alert.alert("エラー", "チャットの作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to handle message:", error);
      Alert.alert("エラー", "メッセージ機能でエラーが発生しました");
    }
  };

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
      
      // Refetch posts to update UI
      await refetchPosts();
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      Alert.alert("エラー", "リアクションの送信に失敗しました");
    }
  };

  const handleViewProfile = (postUserId: string) => {
    if (postUserId !== userId) {
      navigation.navigate("Profile", { userId: postUserId });
    }
  };

  const handleTextLayout = (postId: string, event: any) => {
    const { lines } = event.nativeEvent;
    if (lines && lines.length > 3) {
      setTextExceedsLines((prev) => ({
        ...prev,
        [postId]: true,
      }));
    }
  };

  const handleToggleExpand = (postId: string) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const renderPost = ({ item }: { item: Post }) => {
    // Safety check: Ensure post has user data
    if (!item || !item.user) {
      console.warn('[UserProfileScreen] Post missing user data:', item?.id);
      return null;
    }

    const isExpanded = expandedPosts[item.id] || false;
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
                source={{ uri: getProfilePicture(item.user.profile_pictures, 0) }}
                style={styles.profileImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                accessibilityLabel={`${item.user.name}のプロフィール写真`}
              />
              <View style={styles.userDetails}>
                <View style={styles.postUserName}>
                  <Text style={styles.postUsername}>{item.user.name}</Text>
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
                accessibilityRole="button"
                accessibilityLabel="投稿のメニューを開く"
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
          const videoHeight = width / aspectRatio;

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
                  <VideoPlayer
                    videoUri={video}
                    style={styles.videoPlayer}
                    aspectRatio={item.aspect_ratio}
                    onFullscreenRequest={() =>
                      handleFullscreenVideoRequest(video)
                    }
                  />
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
                      getProfilePicture(item.user.profile_pictures, 0),
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

  const renderProfileSection = (title: string, children: React.ReactNode, useCardStyle: boolean = true) => (
    <View style={[styles.section, useCardStyle && styles.sectionCard]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderProfileItem = (label: string, value: string) => (
    <View style={styles.profileItem}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <EmptyState
          title="プロフィールが見つかりません"
          subtitle="このユーザーのプロフィールを表示できません。"
        />
      </SafeAreaView>
    );
  }

  // Validate profile structure - ensure we have at least a name or basic info
  const profileName = profile.basic?.name;
  if (!profileName && !profile.basic) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <EmptyState
          title="プロフィールデータが不完全です"
          subtitle="このプロフィールのデータを読み込めませんでした。"
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Image
            source={require("../../assets/images/Icons/Arrow-LeftGrey.png")}
            style={styles.backIconImage}
            resizeMode="contain"
          />
          <Text style={styles.backLabel}>戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Section - Profile Image with Gradient Overlay */}
        <View style={styles.profileImageContainer}>
          <ExpoImage
            source={{ uri: getProfilePicture(profile.profile_pictures, 0) }}
            style={styles.mainProfileImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={200}
          />
          {/* Gradient Overlay at bottom - fades to white with smooth easing */}
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.15)',
              'rgba(255,255,255,0.3)',
              'rgba(255,255,255,0.5)',
              'rgba(255,255,255,0.75)',
              'rgba(255,255,255,0.9)',
              'rgba(255,255,255,1)',
            ]}
            locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1]}
            style={styles.imageGradient}
          />
        </View>

        {/* Basic Info Section */}
        <View style={styles.basicInfoSection}>
          <Text style={styles.userName}>{profile.basic?.name || 'ユーザー'}</Text>

          {/* Online Status / Last Active */}
          {profileId !== userId && (
            <View style={styles.statusRow}>
              {isOnline === true && (
                <View style={styles.onlineStatusContainer}>
                  <View style={styles.onlineStatusDot} />
                  <Text style={styles.onlineStatusText}>オンライン</Text>
                </View>
              )}
              {isOnline === false && lastActiveAt && (
                <Text style={styles.lastActiveText}>
                  最後にアクセス: <Text style={styles.lastActiveHighlight}>{formatLastActive(lastActiveAt)}</Text>
                </Text>
              )}
            </View>
          )}

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={Colors.gray[500]}
            />
            <Text style={styles.locationText}>
              {profile.location?.prefecture || profile.basic?.prefecture || '未設定'}
            </Text>
          </View>
          {/* Show prefecture again if different from location */}
          {profile.basic?.prefecture && profile.basic.prefecture !== profile.location?.prefecture && (
            <Text style={styles.subLocationText}>{profile.basic.prefecture}</Text>
          )}
        </View>

        {/* Self Introduction Section */}
        {profile.bio && profile.bio.trim() && renderProfileSection(
          "自己紹介",
          <Text style={styles.bioText}>{profile.bio}</Text>,
        )}

        {/* Basic Profile Section */}
        {profile.basic && renderProfileSection(
          "基本プロフィール",
          <View style={styles.profileGrid}>
            {profile.basic.age && profile.basic.age !== "0" && profile.basic.age !== "" && renderProfileItem("年齢", profile.basic.age)}
            {profile.basic.gender && profile.basic.gender !== "" && renderProfileItem("性別", profile.basic.gender)}
            {profile.basic.prefecture && profile.basic.prefecture !== "" && renderProfileItem("居住地", profile.basic.prefecture)}
            {profile.basic.blood_type && profile.basic.blood_type !== "" && renderProfileItem("血液型", profile.basic.blood_type)}
            {profile.basic.favorite_club && profile.basic.favorite_club !== "" && renderProfileItem("好きなクラブ", profile.basic.favorite_club)}
            {profile.basic.height && profile.basic.height !== "" && renderProfileItem("身長", profile.basic.height + " cm")}
            {profile.basic.body_type && profile.basic.body_type !== "" && renderProfileItem("体型", profile.basic.body_type)}
            {profile.basic.smoking && profile.basic.smoking !== "" && renderProfileItem("タバコ", profile.basic.smoking)}
            {profile.basic.personality_type && profile.basic.personality_type !== "" &&
              renderProfileItem(
                "16 パーソナリティ",
                profile.basic.personality_type,
              )}
          </View>,
        )}

        {/* Golf Profile Section */}
        {profile.golf && renderProfileSection(
          "ゴルフプロフィール",
          <View style={styles.profileGrid}>
            {profile.golf.skill_level && profile.golf.skill_level !== "" && renderProfileItem("スキルレベル", profile.golf.skill_level)}
            {profile.golf.experience && profile.golf.experience !== "" && renderProfileItem("ゴルフ歴", profile.golf.experience)}
            {profile.golf.average_score && profile.golf.average_score !== "0" && profile.golf.average_score !== "" && renderProfileItem("平均スコア", profile.golf.average_score)}
            {profile.golf.best_score && profile.golf.best_score !== "" && renderProfileItem("ベストスコア", profile.golf.best_score)}
            {profile.golf.transportation && profile.golf.transportation !== "" && renderProfileItem("移動手段", profile.golf.transportation)}
            {profile.golf.play_fee && profile.golf.play_fee !== "" && renderProfileItem("プレイフィー", profile.golf.play_fee)}
            {profile.golf.available_days && profile.golf.available_days !== "" && renderProfileItem("ラウンド可能日", profile.golf.available_days)}
          </View>,
        )}

        {/* Golf Availability Calendar */}
        {calendarData &&
          renderProfileSection(
            "ゴルフ可能日",
            <GolfCalendar
              calendarData={calendarData}
              onDatePress={(date) => console.log("Date pressed:", date)}
              onMonthChange={handleMonthChange}
              currentYear={currentYear}
              currentMonth={currentMonth}
            />,
          )}

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>投稿</Text>
          {posts.length > 0 ? (
            <View>
              <FlatList
                data={posts.slice(0, 3)}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
              {posts.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllPostsButton}
                  onPress={() => navigation.navigate("UserPosts", { userId })}
                >
                  <Text style={styles.viewAllPostsText}>
                    すべての投稿を見る
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyPostsContainer}>
              <EmptyState
                title="投稿がありません"
                subtitle="このユーザーはまだ投稿していません。"
              />
            </View>
          )}
        </View>

        {/* Bottom Spacing for Like Button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Like Button - Fixed at Bottom (only for other users) */}
      {profileId !== userId && (
        <View style={styles.likeButtonContainer}>
          <TouchableOpacity
            style={[
              styles.likeButton,
              isLiked && styles.likeButtonLiked,
              isLoadingLike && styles.likeButtonLoading,
            ]}
            onPress={handleLike}
            disabled={isLoadingLike || isLiked}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? "いいね済み" : "いいね"}
          >
            {isLoadingLike ? (
              <Text style={styles.likeButtonText}>処理中...</Text>
            ) : (
              <Text
                style={[
                  styles.likeButtonText,
                  isLiked && styles.likeButtonTextLiked,
                ]}
              >
                {isLiked ? "いいね済み" : "いいね"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen Image Viewer */}
      <FullscreenImageViewer
        visible={showImageViewer}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Fullscreen Video Modal */}
      {showFullscreenVideo && (
        <View style={styles.fullscreenVideoModal}>
          <TouchableOpacity
            style={styles.closeFullscreenButton}
            onPress={() => setShowFullscreenVideo(false)}
          >
            <Ionicons name="close" size={32} color={Colors.white} />
          </TouchableOpacity>
          <VideoPlayer
            videoUri={fullscreenVideoUri}
            style={styles.fullscreenVideoPlayer}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xs,
    gap: 4,
  },
  backIconImage: {
    width: 18,
    height: 18,
  },
  backLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    width: "100%",
    height: width * 1.1,
    position: "relative",
  },
  mainProfileImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    zIndex: 1,
  },
  basicInfoSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  userName: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  statusRow: {
    marginBottom: Spacing.sm,
  },
  onlineStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  onlineStatusText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
  },
  lastActiveText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  lastActiveHighlight: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[500],
    marginLeft: Spacing.xs,
  },
  subLocationText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[500],
    marginLeft: 20,
    marginBottom: Spacing.xs,
  },
  section: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.lightGreen + "40",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  bioText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  profileGrid: {
    gap: Spacing.xs,
  },
  profileItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.5)",
  },
  profileLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[500],
    flex: 1,
  },
  profileValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.primary,
    flex: 1,
    textAlign: "right",
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
  postUserName: {
    flexDirection: "row",
    alignItems: "center",
  },
  postUsername: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginRight: Spacing.xs,
  },
  verificationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(32,178,170,0.85)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  verificationText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(218,165,32,0.9)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  premiumText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
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
  shareButton: {
    padding: Spacing.xs,
  },
  loadMoreButton: {
    backgroundColor: Colors.gray[100],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  loadMoreText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.primary,
  },
  postsSection: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.lightGreen + "40",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  emptyPostsContainer: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  viewAllPostsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  viewAllPostsText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
    marginRight: Spacing.xs,
  },
  bottomSpacing: {
    height: 100, // Space for fixed like button
  },
  likeButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  likeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  likeButtonLiked: {
    backgroundColor: Colors.gray[300],
  },
  likeButtonLoading: {
    backgroundColor: Colors.gray[400],
  },
  likeButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  likeButtonTextLiked: {
    color: Colors.gray[600],
  },
  fullscreenVideoModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  closeFullscreenButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1001,
    padding: Spacing.sm,
  },
  fullscreenVideoPlayer: {
    width: "100%",
    height: "100%",
  },
});

export default UserProfileScreen;
