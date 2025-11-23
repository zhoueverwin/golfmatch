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
  ActivityIndicator,
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
import { Post } from "../types/dataModels";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import ImageCarousel from "../components/ImageCarousel";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import VideoPlayer from "../components/VideoPlayer";
import { DataProvider } from "../services";
import { getProfilePicture } from "../constants/defaults";
import { useUserPosts } from "../hooks/queries/usePosts";

const { width } = Dimensions.get("window");

type UserPostsScreenRouteProp = RouteProp<RootStackParamList, "UserPosts">;
type UserPostsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const UserPostsScreen: React.FC = () => {
  const route = useRoute<UserPostsScreenRouteProp>();
  const navigation = useNavigation<UserPostsScreenNavigationProp>();
  const { userId } = route.params;
  const { profileId } = useAuth();

  // Use React Query hook for posts
  const {
    posts,
    isLoading: loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: postsLoading,
    refetch,
  } = useUserPosts(userId);

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoUri, setFullscreenVideoUri] = useState<string>("");
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [textExceedsLines, setTextExceedsLines] = useState<Record<string, boolean>>({});

  const handleImagePress = (images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleFullscreenVideoRequest = (videoUri: string) => {
    setFullscreenVideoUri(videoUri);
    setShowFullscreenVideo(true);
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
              onPress={() => navigation.navigate("Profile", { userId: item.user.id })}
            >
              <Image
                source={{ uri: getProfilePicture(item.user.profile_pictures, 0) }}
                style={styles.profileImage}
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
                </View>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
            </TouchableOpacity>
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
                  console.warn(`[UserPostsScreen] Skipping local file path: ${video.substring(0, 50)}...`);
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
              accessibilityRole="button"
              accessibilityLabel="リアクション"
            >
              <View style={styles.heartIconContainer}>
                <Ionicons
                  name="heart-outline"
                  size={20}
                  color={Colors.gray[600]}
                />
              </View>
              <Text style={styles.actionText}>{item.reactions_count || item.likes || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading />
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
          <Image
            source={require("../../assets/images/Icons/Arrow-LeftGrey.png")}
            style={styles.backIconImage}
            resizeMode="contain"
            fadeDuration={0}
          />
          <Text style={styles.backLabel}>戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>投稿</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {posts.length > 0 ? (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              hasNextPage ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => fetchNextPage()}
                  disabled={postsLoading}
                >
                  <Text style={styles.loadMoreText}>
                    {postsLoading ? "読み込み中..." : "次のページ"}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        ) : (
          <EmptyState
            title="投稿がありません"
            subtitle="このユーザーはまだ投稿していません。"
          />
        )}
      </ScrollView>

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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginLeft: -Spacing.md,
    gap: 8,
    minHeight: 44,
    zIndex: 10,
  },
  backIconImage: {
    width: 18,
    height: 18,
  },
  backLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    marginLeft: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 80,
  },
  scrollView: {
    flex: 1,
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
  actionText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.gray[500],
    marginLeft: 4,
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
    fontFamily: Typography.fontFamily.regular,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  fullscreenVideoModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
    zIndex: 1000,
  },
  closeFullscreenButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1001,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 10,
  },
  fullscreenVideoPlayer: {
    width: "100%",
    height: "100%",
  },
});

export default UserPostsScreen;
