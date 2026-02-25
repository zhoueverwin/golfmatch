import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import { SwipeCardWithRef, SwipeCardRef } from "./SwipeCard";
import { DataProvider } from "../services";
import { useAuth } from "../contexts/AuthContext";
import { userInteractionService } from "../services/userInteractionService";
import { CacheService } from "../services/cacheService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// Tab bar height from AppNavigator: 65 + Math.max(insets.bottom * 0.5, 4)
const TAB_BAR_BASE_HEIGHT = 65;
const MAX_TODAY_USERS = 3;

interface TodaySwipeViewProps {
  onViewProfile: (userId: string) => void;
}

const TodaySwipeView: React.FC<TodaySwipeViewProps> = ({ onViewProfile }) => {
  const { profileId } = useAuth();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likeCount, setLikeCount] = useState(0);
  const swipeCardRef = useRef<SwipeCardRef>(null);

  // Account for the absolutely-positioned tab bar overlaying content
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom * 0.5, 4);
  // Card height: fill available space minus header, buttons, and tab bar
  const cardHeight = SCREEN_HEIGHT * 0.50;

  const loadUsers = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      await userInteractionService.loadUserInteractions(profileId);
      const interactionState = userInteractionService.getState();
      const excludeIds = [
        profileId,
        ...Array.from(interactionState.likedUsers),
        ...Array.from(interactionState.passedUsers),
      ];

      const response = await DataProvider.getIntelligentRecommendations(
        profileId,
        20,
      );
      let result = response.data || [];

      // Fallback
      if (result.length === 0) {
        const fallback = await DataProvider.getRecommendedUsers(profileId, 20);
        result = fallback.data || [];
      }

      // Filter out interacted users
      result = result.filter(
        (u) =>
          !excludeIds.includes(u.id) &&
          !interactionState.likedUsers.has(u.id) &&
          !interactionState.passedUsers.has(u.id),
      );

      setUsers(result.slice(0, MAX_TODAY_USERS));
      setCurrentIndex(0);
    } catch (error) {
      console.error("TodaySwipeView: Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSwipeRight = useCallback(
    (user: User) => {
      if (!profileId) return;
      // Fire API call async
      userInteractionService.likeUser(profileId, user.id);
      setLikeCount((prev) => prev + 1);
      setCurrentIndex((prev) => prev + 1);
    },
    [profileId],
  );

  const handleSwipeLeft = useCallback(
    (user: User) => {
      if (!profileId) return;
      userInteractionService.passUser(profileId, user.id);
      setCurrentIndex((prev) => prev + 1);
    },
    [profileId],
  );

  const handleTapProfile = useCallback(
    (user: User) => {
      onViewProfile(user.id);
    },
    [onViewProfile],
  );

  const handleRefresh = useCallback(async () => {
    if (profileId) {
      await CacheService.remove(
        `intelligent_recommendations_v2:${profileId}:20`,
      );
    }
    loadUsers();
  }, [loadUsers, profileId]);

  const isExhausted = currentIndex >= users.length && !loading;

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header bar */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.headerBar}
      >
        <Text style={styles.headerTitle}>本日のおすすめ</Text>
        <View style={styles.likeCountBadge}>
          <Ionicons name="heart" size={14} color={Colors.primary} />
          <Text style={styles.likeCountText}>いいね ×{likeCount}</Text>
        </View>
      </LinearGradient>

      {/* Card area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>おすすめを読み込み中...</Text>
        </View>
      ) : isExhausted ? (
        <View style={styles.emptyContainer}>
          {/* Profile card icon with shadow — Pairs style */}
          <View style={styles.emptyIconWrapper}>
            <View style={styles.emptyIconCard}>
              <Ionicons name="person" size={48} color={Colors.gray[300]} />
            </View>
            <View style={styles.emptyIconShadow} />
          </View>
          <Text style={styles.emptyTitle}>
            本日ご提案したお相手はすべて確認されました
          </Text>
          <Text style={styles.emptySubtitle}>
            明日、また新しいお相手をご提案します！
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.cardContainer}>
            <SwipeCardWithRef
              ref={swipeCardRef}
              users={users}
              currentIndex={currentIndex}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onTapProfile={handleTapProfile}
              cardHeight={cardHeight}
            />
          </View>

          {/* Action buttons */}
          <View style={[styles.actionButtons, { paddingBottom: tabBarHeight + Spacing.sm }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => swipeCardRef.current?.triggerSwipe("left")}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={26} color={Colors.gray[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => swipeCardRef.current?.triggerSwipe("right")}
              activeOpacity={0.7}
            >
              <Ionicons name="heart" size={30} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  likeCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  likeCountText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrapper: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyIconCard: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconShadow: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[100],
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    textAlign: "center",
    lineHeight: 24,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  skipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
});

export default TodaySwipeView;
