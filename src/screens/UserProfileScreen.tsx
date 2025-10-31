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
import { SafeAreaView } from "react-native-safe-area-context";
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
import Card from "../components/Card";
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

const { width } = Dimensions.get("window");

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;
type UserProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const UserProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const { userId } = route.params;
  const { profileId } = useAuth(); // Get current user's profile ID

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
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

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadProfile(),
        loadCalendarData(),
        checkIfLiked(),
        trackProfileView(), // Track that this user viewed the profile
        loadOnlineStatus(), // Load online status
      ]);
      setLoading(false);
      // Load posts after profile to avoid race condition
      loadPosts();
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
        loadPosts();
        loadCalendarData();
      }
    }, [userId, profileId]),
  );

  const loadProfile = async () => {
    try {
      const response = await DataProvider.getUserProfile(userId);
      if (response.error) {
        console.error("Failed to load profile:", response.error);
      } else {
        setProfile(response.data || null);
      }
    } catch (_error) {
      console.error("Error loading profile:", _error);
    }
  };

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

  const loadPosts = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setPostsLoading(true);
        }

        const page = loadMore ? Math.ceil(posts.length / 10) + 1 : 1;
        console.log(
          `Loading posts for user ${userId}, page ${page}, loadMore: ${loadMore}`,
        );

        const response = await DataProvider.getUserPosts(userId, page);

        if (response.error) {
          console.error("Failed to load posts:", response.error);
          setPosts([]);
        } else {
          const list = (response.data as unknown as Post[]) || [];
          console.log(`Loaded ${list.length} posts for user ${userId}`);
          if (loadMore) {
            const newPosts = list.map((post, index) => ({
              ...post,
              id: `${post.id}-${Date.now()}-${index}`,
            }));
            setPosts((prevPosts) => [...prevPosts, ...newPosts]);
            setHasMorePosts(response.pagination?.hasMore || false);
          } else {
            // For profile view, only show first 3 posts
            const limitedList = list.slice(0, 3);
            setPosts(limitedList);
            setHasMorePosts(list.length > 3 || (response.pagination?.hasMore || false));
          }
        }
      } catch (_error) {
        console.error("Error loading posts:", _error);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    },
    [userId, posts.length],
  );

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
    const targetUserName = postUserName || profile?.basic.name;
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
      
      // Optimistically update UI
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                hasReacted: !p.hasReacted,
                reactions_count: p.hasReacted 
                  ? (p.reactions_count || 0) - 1 
                  : (p.reactions_count || 0) + 1,
              }
            : p,
        ),
      );
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

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.postCard} shadow="small">
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleViewProfile(item.user.id)}
        >
          <Image
            source={{ uri: getProfilePicture(item.user.profile_pictures, 0) }}
            style={styles.smallProfileImage}
            accessibilityLabel={`${item.user.name}のプロフィール写真`}
          />
          <View style={styles.userDetails}>
            <View style={styles.postNameRow}>
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

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={Colors.gray[600]}
          />
        </TouchableOpacity>
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
                console.warn(`[UserProfileScreen] Skipping local file path: ${video.substring(0, 50)}...`);
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

  const renderProfileSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderProfileItem = (label: string, value: string) => (
    <View style={styles.profileItem}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );

  if (loading) {
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section - Profile Image */}
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: getProfilePicture(profile.profile_pictures, 0) }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>

        {/* Basic Info Section */}
        <View style={styles.basicInfoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profile.basic.name}</Text>
            {profile.status?.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Colors.primary}
                style={{ marginLeft: 8 }}
              />
            )}
          </View>

          {/* Online Status */}
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
                  最後にアクセス: {formatLastActive(lastActiveAt)}
                </Text>
              )}
            </View>
          )}

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={Colors.gray[600]}
            />
            <Text style={styles.locationText}>
              {profile.location?.prefecture || profile.basic.prefecture}
            </Text>
          </View>

          {profile.golf.round_fee && (
            <View style={styles.roundFeeRow}>
              <Text style={styles.roundFeeText}>
                ラウンド料金: {profile.golf.round_fee}
              </Text>
              <TouchableOpacity>
                <Text style={styles.roundFeeLink}>ラウンド料金とは</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Self Introduction Section */}
        {profile.bio && profile.bio.trim() && renderProfileSection(
          "自己紹介",
          <Text style={styles.bioText}>{profile.bio}</Text>,
        )}

        {/* Basic Profile Section */}
        {renderProfileSection(
          "基本プロフィール",
          <View style={styles.profileGrid}>
            {profile.basic.age && profile.basic.age !== "0" && renderProfileItem("年齢", profile.basic.age)}
            {profile.basic.gender && renderProfileItem("性別", profile.basic.gender)}
            {profile.basic.prefecture && renderProfileItem("居住地", profile.basic.prefecture)}
            {profile.basic.blood_type && renderProfileItem("血液型", profile.basic.blood_type)}
            {profile.basic.favorite_club && renderProfileItem("好きなクラブ", profile.basic.favorite_club)}
            {profile.basic.height && renderProfileItem("身長", profile.basic.height + " cm")}
            {profile.basic.body_type && renderProfileItem("体型", profile.basic.body_type)}
            {profile.basic.smoking && renderProfileItem("タバコ", profile.basic.smoking)}
            {profile.basic.personality_type &&
              renderProfileItem(
                "16 パーソナリティ",
                profile.basic.personality_type,
              )}
          </View>,
        )}

        {/* Golf Profile Section */}
        {renderProfileSection(
          "ゴルフプロフィール",
          <View style={styles.profileGrid}>
            {profile.golf.skill_level && renderProfileItem("スキルレベル", profile.golf.skill_level)}
            {profile.golf.experience && renderProfileItem("ゴルフ歴", profile.golf.experience)}
            {profile.golf.average_score && profile.golf.average_score !== "0" && renderProfileItem("平均スコア", profile.golf.average_score)}
            {profile.golf.best_score && renderProfileItem("ベストスコア", profile.golf.best_score)}
            {profile.golf.transportation && renderProfileItem("移動手段", profile.golf.transportation)}
            {profile.golf.play_fee && renderProfileItem("プレイフィー", profile.golf.play_fee)}
            {profile.golf.available_days && renderProfileItem("ラウンド可能日", profile.golf.available_days)}
            {profile.golf.round_fee && renderProfileItem("ラウンド料金", profile.golf.round_fee)}
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
        {renderProfileSection(
          "投稿",
          <View>
            {posts.length > 0 ? (
              <View>
                <FlatList
                  data={posts}
                  renderItem={renderPost}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
                {hasMorePosts && (
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
              <EmptyState
                title="投稿がありません"
                subtitle="このユーザーはまだ投稿していません。"
              />
            )}
          </View>,
        )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    width: "100%",
    height: width * 1.2, // Full width with good aspect ratio
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  basicInfoSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  statusRow: {
    marginBottom: Spacing.sm,
  },
  onlineStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
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
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
  },
  lastActiveText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  locationText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    marginLeft: Spacing.xs,
  },
  roundFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundFeeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  roundFeeLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  bioText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  profileGrid: {
    gap: Spacing.sm,
  },
  profileItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  profileLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    flex: 1,
  },
  profileValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
    textAlign: "right",
  },
  postCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  smallProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginRight: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
  },
  moreButton: {
    padding: Spacing.xs,
  },
  postContent: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    marginBottom: Spacing.md,
  },
  imageCarousel: {
    marginBottom: Spacing.md,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
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
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
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
  },
  viewAllPostsText: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
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
  videoContainer: {
    width: "100%",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  videoItem: {
    width: "100%",
    marginBottom: Spacing.sm,
  },
  videoPlayer: {
    width: "100%",
    aspectRatio: 16 / 9,
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
