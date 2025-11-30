import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { Post } from "../types/dataModels";
import ImageCarousel from "./ImageCarousel";
import VideoPlayer from "./VideoPlayer";
import { logLayout, logRender } from "../utils/scrollDebug";

const { width: screenWidth } = Dimensions.get("window");

// Memoized sub-components
const ProfileImage = memo(({ uri, name }: { uri: string; name: string }) => (
  <ExpoImage
    source={{ uri }}
    style={styles.profileImage}
    contentFit="cover"
    cachePolicy="memory-disk"
    transition={0}
    accessibilityLabel={`${name}のプロフィール写真`}
  />
));

const VerificationBadge = memo(() => (
  <View style={styles.verificationPill}>
    <Ionicons name="shield-checkmark" size={12} color={Colors.white} />
    <Text style={styles.verificationText}>認証</Text>
  </View>
));

const PremiumBadge = memo(() => (
  <View style={styles.premiumPill}>
    <Ionicons name="diamond" size={12} color={Colors.white} />
    <Text style={styles.premiumText}>会員</Text>
  </View>
));

interface PostItemProps {
  item: Post;
  index: number;
  isVisible: boolean;
  isExpanded: boolean;
  exceedsLines: boolean;
  isOwnPost: boolean;
  hasMutualLikes: boolean;
  onViewProfile: (userId: string) => void;
  onReaction: (postId: string) => void;
  onMessage: (userId: string, userName: string, userImage: string, hasMutualLikes: boolean) => void;
  onImagePress: (images: string[], index: number) => void;
  onToggleExpand: (postId: string) => void;
  onPostMenu: (post: Post) => void;
  onOpenPostMenu: (post: Post) => void;
}

const PostItem: React.FC<PostItemProps> = ({
  item,
  index,
  isVisible,
  isExpanded,
  exceedsLines,
  isOwnPost,
  hasMutualLikes,
  onViewProfile,
  onReaction,
  onMessage,
  onImagePress,
  onToggleExpand,
  onPostMenu,
  onOpenPostMenu,
}) => {
  // Track render count and last height for debugging
  const lastHeightRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  renderCountRef.current += 1;
  
  // Log render in DEV mode
  logRender('PostItem', item.id.slice(0, 8));
  
  const showMoreButton = exceedsLines && !isExpanded && item.content;

  const handleViewProfile = useCallback(() => {
    onViewProfile(item.user.id);
  }, [onViewProfile, item.user.id]);

  const handleReaction = useCallback(() => {
    onReaction(item.id);
  }, [onReaction, item.id]);

  const handleMessage = useCallback(() => {
    onMessage(item.user.id, item.user.name, item.user.profile_pictures[0], hasMutualLikes);
  }, [onMessage, item.user.id, item.user.name, item.user.profile_pictures, hasMutualLikes]);

  const handleImagePress = useCallback((imageIndex: number) => {
    onImagePress(item.images, imageIndex);
  }, [onImagePress, item.images]);

  const handleToggleExpand = useCallback(() => {
    onToggleExpand(item.id);
  }, [onToggleExpand, item.id]);

  const handlePostMenu = useCallback(() => {
    onPostMenu(item);
  }, [onPostMenu, item]);

  const handleOpenPostMenu = useCallback(() => {
    onOpenPostMenu(item);
  }, [onOpenPostMenu, item]);

  // Filter valid videos
  const validVideos = useMemo(() => {
    return item.videos?.filter((video) => {
      if (!video || typeof video !== "string" || video.trim() === "") return false;
      if (video.startsWith("file://")) return false;
      return true;
    }) || [];
  }, [item.videos]);

  // Calculate video height based on aspect ratio for stable layout
  const videoHeight = useMemo(() => {
    const ratio = item.aspect_ratio || (9 / 16); // Default to portrait
    return screenWidth / ratio;
  }, [item.aspect_ratio]);

  // Memoize video item style for stable layout - prevents FlashList layout shifts
  const videoItemStyle = useMemo(() => ({
    width: "100%" as const,
    height: videoHeight,
    marginBottom: Spacing.sm,
  }), [videoHeight]);

  // DEV: Log actual vs predicted height for debugging scroll jitter
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (__DEV__) {
      const actualHeight = event.nativeEvent.layout.height;
      const actualWidth = event.nativeEvent.layout.width;
      const ratio = item.aspect_ratio || 1;
      
      // Check if height changed from last layout
      const heightChanged = Math.abs(lastHeightRef.current - actualHeight) > 1;
      
      // Replicate the override calculation from HomeScreen
      const HEADER_HEIGHT = 63;
      const FOOTER_HEIGHT = 51;
      const TEXT_ESTIMATE = item.content ? 56 : 0;
      const baseHeight = HEADER_HEIGHT + FOOTER_HEIGHT + TEXT_ESTIMATE;
      
      let mediaHeight = 0;
      if (item.videos && item.videos.length > 0) {
        mediaHeight = (screenWidth / ratio) + 16;
      } else if (item.images && item.images.length > 0) {
        mediaHeight = screenWidth / ratio;
      }
      
      const predictedHeight = baseHeight + mediaHeight;
      
      // Use the new debug utility
      logLayout('PostItem', item.id.slice(0, 8), actualHeight, actualWidth, predictedHeight);
      
      // Log if height changed after initial render (indicates layout shift)
      if (heightChanged && lastHeightRef.current > 0) {
        console.warn(`[PostItem SHIFT] id=${item.id.slice(0,8)} render#${renderCountRef.current}: ${lastHeightRef.current.toFixed(0)} → ${actualHeight.toFixed(0)} (Δ${(actualHeight - lastHeightRef.current).toFixed(0)}px)`);
      }
      
      lastHeightRef.current = actualHeight;
    }
  }, [item.id, item.aspect_ratio, item.content, item.images, item.videos]);

  return (
    <View style={styles.postCard} onLayout={handleLayout}>
      {/* Content and header section with padding */}
      <View style={styles.postContentSection}>
        {/* Profile Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.userInfo} onPress={handleViewProfile}>
            <ProfileImage uri={item.user.profile_pictures[0]} name={item.user.name} />
            <View style={styles.userDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{item.user.name}</Text>
                {item.user.is_verified && <VerificationBadge />}
                {item.user.is_premium && <PremiumBadge />}
              </View>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={isOwnPost ? handlePostMenu : handleOpenPostMenu}
            accessibilityRole="button"
            accessibilityLabel="投稿のメニューを開く"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        {item.content && (
          <View style={styles.postContentContainer}>
            <Text
              style={styles.postContent}
              numberOfLines={isExpanded ? undefined : 3}
            >
              {item.content}
            </Text>
            {showMoreButton && (
              <TouchableOpacity onPress={handleToggleExpand} activeOpacity={0.7} style={styles.expandButton}>
                <Text style={styles.moreLink}>もっと見る</Text>
              </TouchableOpacity>
            )}
            {isExpanded && exceedsLines && (
              <TouchableOpacity onPress={handleToggleExpand} activeOpacity={0.7} style={styles.expandButton}>
                <Text style={styles.moreLink}>折りたたむ</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Post Images */}
      {item.images.length > 0 && (
        <ImageCarousel
          images={item.images}
          fullWidth={true}
          style={styles.imageCarouselFullWidth}
          aspectRatio={item.aspect_ratio}
          onImagePress={handleImagePress}
        />
      )}

      {/* Post Videos */}
      {validVideos.length > 0 && (
        <View style={styles.videoContainer}>
          {validVideos.map((video) => (
            <View key={video} style={videoItemStyle}>
              <VideoPlayer
                videoUri={video}
                style={styles.videoPlayer}
                aspectRatio={item.aspect_ratio}
                isActive={isVisible}
              />
            </View>
          ))}
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActionsSection}>
        <View style={styles.postActions}>
          {/* Reaction button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReaction}
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

          {/* Message button */}
          {!isOwnPost && (
            <TouchableOpacity
              style={[styles.actionButton, !hasMutualLikes && styles.disabledActionButton]}
              onPress={handleMessage}
              accessibilityRole="button"
              accessibilityLabel={hasMutualLikes ? "メッセージ" : "メッセージ（お互いにいいねが必要）"}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={hasMutualLikes ? Colors.gray[600] : Colors.gray[400]}
              />
              <Text style={[styles.actionText, !hasMutualLikes && styles.disabledActionText]}>
                メッセージ
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// Custom comparison function for memo
const areEqual = (prevProps: PostItemProps, nextProps: PostItemProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.hasReacted === nextProps.item.hasReacted &&
    prevProps.item.reactions_count === nextProps.item.reactions_count &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.exceedsLines === nextProps.exceedsLines &&
    prevProps.hasMutualLikes === nextProps.hasMutualLikes
  );
};

export default memo(PostItem, areEqual);

const styles = StyleSheet.create({
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
  imageCarouselFullWidth: {
    marginTop: 0,
    marginHorizontal: 0,
  },
  videoContainer: {
    marginTop: Spacing.sm,
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
  disabledActionButton: {
    opacity: 0.5,
  },
  disabledActionText: {
    color: Colors.gray[400],
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
});
