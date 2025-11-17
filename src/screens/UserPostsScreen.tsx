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
import Card from "../components/Card";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import ImageCarousel from "../components/ImageCarousel";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import VideoPlayer from "../components/VideoPlayer";
import { DataProvider } from "../services";
import { getProfilePicture } from "../constants/defaults";

const { width } = Dimensions.get("window");

type UserPostsScreenRouteProp = RouteProp<RootStackParamList, "UserPosts">;
type UserPostsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const UserPostsScreen: React.FC = () => {
  const route = useRoute<UserPostsScreenRouteProp>();
  const navigation = useNavigation<UserPostsScreenNavigationProp>();
  const { userId } = route.params;
  const { profileId } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoUri, setFullscreenVideoUri] = useState<string>("");

  useEffect(() => {
    loadPosts();
  }, [userId]);

  // Refresh posts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [userId]),
  );

  const loadPosts = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setPostsLoading(true);
        } else {
          setLoading(true);
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
            setPosts(list);
            setHasMorePosts(response.pagination?.hasMore || false);
          }
        }
      } catch (_error) {
        console.error("Error loading posts:", _error);
        setPosts([]);
      } finally {
        setLoading(false);
        setPostsLoading(false);
      }
    },
    [userId, posts.length],
  );

  const handleImagePress = (images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleFullscreenVideoRequest = (videoUri: string) => {
    setFullscreenVideoUri(videoUri);
    setShowFullscreenVideo(true);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.postCard} shadow="small">
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate("Profile", { userId: item.user.id })}
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

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.actionButtons}>
          {/* Reaction button */}
          <TouchableOpacity
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="リアクション"
          >
            <Ionicons
              name="thumbs-up-outline"
              size={24}
              color={Colors.gray[600]}
            />
            <Text style={styles.actionText}>{item.reactions_count || item.likes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

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
              hasMorePosts ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => loadPosts(true)}
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
  scrollView: {
    flex: 1,
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
    marginLeft: 4,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[500],
  },
  postContent: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
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
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[600],
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
