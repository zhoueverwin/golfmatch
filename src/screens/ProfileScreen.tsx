import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { RootStackParamList } from "../types";
import { DataProvider } from "../services";
import { User, Post } from "../types/dataModels";
import ImageCarousel from "../components/ImageCarousel";
import VideoPlayer from "../components/VideoPlayer";
import { useAuth } from "../contexts/AuthContext";

const { width } = Dimensions.get("window");

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { userId } = route.params;
  const { profileId } = useAuth(); // Get current user's profile ID

  const [profile, setProfile] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);

  useEffect(() => {
    loadProfile();
    loadUserPosts();
    checkIfLiked();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await DataProvider.getUserById(userId);
      
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || "プロフィールの読み込みに失敗しました。");
      }
    } catch (err) {
      setError("プロフィールの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await DataProvider.getUserPosts(userId, 1, 20);
      
      if (response.success && response.data) {
        // Ensure response.data is an array
        const postsData = Array.isArray(response.data) ? response.data : [response.data];
        setUserPosts(postsData);
      }
    } catch (err) {
      console.error("Failed to load user posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  const checkIfLiked = async () => {
    if (!profileId || profileId === userId) return; // Don't check if viewing own profile
    
    try {
      const response = await DataProvider.getUserLikes(profileId);
      if (response.success && response.data) {
        const hasLiked = response.data.some(like => like.liked_user_id === userId);
        setIsLiked(hasLiked);
      }
    } catch (err) {
      console.error("Failed to check like status:", err);
    }
  };

  const handleLikeToggle = async () => {
    if (!profileId || profileId === userId || likingInProgress) return;
    
    setLikingInProgress(true);
    try {
      if (isLiked) {
        await DataProvider.unlikeUser(profileId, userId);
        setIsLiked(false);
      } else {
        await DataProvider.likeUser(profileId, userId, "like");
        setIsLiked(true);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setLikingInProgress(false);
    }
  };

  const getSkillLevelText = (level: string): string => {
    switch (level) {
      case "beginner":
        return "ビギナー";
      case "intermediate":
        return "中級者";
      case "advanced":
        return "上級者";
      case "professional":
        return "プロ";
      default:
        return "未設定";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>プロフィールを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || "プロフィールが見つかりません"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Images/Video Carousel */}
        {profile.profile_pictures && profile.profile_pictures.length > 0 && (
          <View style={styles.imageCarouselContainer}>
            <ImageCarousel
              images={profile.profile_pictures}
            />
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={Colors.gray[500]} />
            <Text style={styles.infoText}>
              {profile.prefecture || "未設定"} {profile.age ? `・ ${profile.age}歳` : ""}
            </Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>自己紹介</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Golf Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ゴルフ情報</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>スキルレベル</Text>
              <Text style={styles.infoValue}>
                {getSkillLevelText(profile.golf_skill_level)}
              </Text>
            </View>
            {profile.average_score && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>平均スコア</Text>
                <Text style={styles.infoValue}>{profile.average_score}</Text>
              </View>
            )}
            {profile.best_score && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ベストスコア</Text>
                <Text style={styles.infoValue}>{profile.best_score}</Text>
              </View>
            )}
            {profile.golf_experience && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ゴルフ歴</Text>
                <Text style={styles.infoValue}>{profile.golf_experience}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>
          <View style={styles.infoGrid}>
            {profile.height && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>身長</Text>
                <Text style={styles.infoValue}>{profile.height}</Text>
              </View>
            )}
            {profile.body_type && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>体型</Text>
                <Text style={styles.infoValue}>{profile.body_type}</Text>
              </View>
            )}
            {profile.blood_type && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>血液型</Text>
                <Text style={styles.infoValue}>{profile.blood_type}</Text>
              </View>
            )}
            {profile.personality_type && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>性格</Text>
                <Text style={styles.infoValue}>{profile.personality_type}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Preferences */}
        {(profile.available_days || profile.round_fee || profile.play_fee) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>プレー情報</Text>
            <View style={styles.infoGrid}>
              {profile.available_days && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>プレー可能日</Text>
                  <Text style={styles.infoValue}>{profile.available_days}</Text>
                </View>
              )}
              {profile.round_fee && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>ラウンド頻度</Text>
                  <Text style={styles.infoValue}>{profile.round_fee}</Text>
                </View>
              )}
              {profile.play_fee && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>プレー費用</Text>
                  <Text style={styles.infoValue}>{profile.play_fee}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* User Posts Section */}
        {userPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>投稿</Text>
            <View style={styles.postsGrid}>
              {userPosts.map((post, index) => (
                <TouchableOpacity 
                  key={post.id} 
                  style={styles.postThumbnail}
                  onPress={() => {
                    // Could navigate to post detail or expand it
                    console.log("Post tapped:", post.id);
                  }}
                >
                  {post.images.length > 0 ? (
                    <Image 
                      source={{ uri: post.images[0] }} 
                      style={styles.postThumbnailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.postThumbnailImage, styles.postThumbnailPlaceholder]}>
                      <Text style={styles.postThumbnailText} numberOfLines={3}>
                        {post.content}
                      </Text>
                    </View>
                  )}
                  <View style={styles.postThumbnailOverlay}>
                    <Ionicons name="thumbs-up" size={12} color={Colors.white} />
                    <Text style={styles.postThumbnailStat}>
                      {post.reactions_count || post.likes || 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Like Button (Fixed at bottom, only for other users) */}
      {profileId && profileId !== userId && (
        <View style={styles.likeButtonContainer}>
          <TouchableOpacity
            style={[
              styles.likeButton,
              isLiked && styles.likeButtonActive,
              likingInProgress && styles.likeButtonDisabled,
            ]}
            onPress={handleLikeToggle}
            disabled={likingInProgress}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? "いいね済み" : "いいね"}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={Colors.white}
            />
            <Text style={styles.likeButtonText}>
              {isLiked ? "いいね済み" : "いいね"}
            </Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  imageCarouselContainer: {
    width: width,
    height: width * 1.2,
  },
  section: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  name: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
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
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.sm,
  },
  infoItem: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  bottomSpacer: {
    height: 100, // Extra space for like button
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -2,
  },
  postThumbnail: {
    width: "33.33%",
    aspectRatio: 1,
    padding: 2,
  },
  postThumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.sm,
  },
  postThumbnailPlaceholder: {
    backgroundColor: Colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xs,
  },
  postThumbnailText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  postThumbnailOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  postThumbnailStat: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    marginLeft: 4,
    fontWeight: Typography.fontWeight.semibold,
  },
  likeButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.medium,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Shadows.small,
  },
  likeButtonActive: {
    backgroundColor: Colors.error,
  },
  likeButtonDisabled: {
    opacity: 0.6,
  },
  likeButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
});

export default ProfileScreen;
