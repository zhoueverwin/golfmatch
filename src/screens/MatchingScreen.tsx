import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import ProfileCard from "../components/ProfileCard";
import Toast from "../components/Toast";
import { DataProvider } from "../services";
import { userInteractionService } from "../services/userInteractionService";
import { useAuth } from "../contexts/AuthContext";

const { width: screenWidth } = Dimensions.get("window");

const MatchingScreen: React.FC = () => {
  const { user, profileId } = useAuth();
  const [matches, setMatches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interactionState, setInteractionState] = useState(
    userInteractionService.getState(),
  );
  const [viewerGender, setViewerGender] = useState<User["gender"] | "unknown">(
    "unknown",
  );

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  // Load recommended users
  const loadRecommendedUsers = async () => {
    try {
      setLoading(true);

      // Get the current user ID from authentication
      const currentUserId = profileId || user?.id;
      if (!currentUserId) {
        console.error("No current user ID available");
        setMatches([]);
        showToast("ユーザー認証が必要です", "error");
        return;
      }

      const response = await DataProvider.getRecommendedUsers(
        currentUserId,
        20,
      );

      if (response.error) {
        console.error("Failed to load recommended users:", response.error);
        setMatches([]);
        showToast("ユーザーの読み込みに失敗しました", "error");
      } else {
        // Apply interaction state to users
        const usersWithInteractionState =
          userInteractionService.applyInteractionState(response.data || []);
        setMatches(usersWithInteractionState);
      }
    } catch (error) {
      console.error("Error loading recommended users:", error);
      setMatches([]);
      showToast("ユーザーの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendedUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadRecommendedUsers();

    // Subscribe to interaction state changes
    const unsubscribe = userInteractionService.subscribe((state) => {
      setInteractionState(state);
      // Re-apply interaction state to current matches
      setMatches((prevMatches) =>
        userInteractionService.applyInteractionState(prevMatches),
      );
    });

    // Load initial interaction state
    const currentUserId = profileId || user?.id;
    if (currentUserId) {
      userInteractionService.loadUserInteractions(currentUserId);
    }

    return unsubscribe;
  }, [profileId, user?.id]);

  // Helper function to show toast
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Interaction handlers
  const handleLike = async (userId: string) => {
    try {
      // Use interaction service to like user
      const currentUserId = profileId || user?.id;
      if (!currentUserId) {
        console.error("No current user ID available");
        return;
      }
      const success = await userInteractionService.likeUser(
        currentUserId,
        userId,
      );

      if (!success) {
        console.error("Failed to like user");
        showToast("いいねの送信に失敗しました", "error");
      } else {
        // Find user name for toast message
        const user = matches.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";

        showToast(`${userName}にいいねを送りました！`, "success");
        console.log("Successfully liked user:", userId);
      }
    } catch (error) {
      console.error("Error liking user:", error);
      showToast("いいねの送信に失敗しました", "error");
    }
  };

  const handlePass = async (userId: string) => {
    try {
      // Use interaction service to pass user
      const currentUserId = profileId || user?.id;
      if (!currentUserId) {
        console.error("No current user ID available");
        return;
      }
      const success = await userInteractionService.passUser(
        currentUserId,
        userId,
      );

      if (!success) {
        console.error("Failed to pass user");
        showToast("パスの送信に失敗しました", "error");
      } else {
        // Find user name for toast message
        const user = matches.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";

        // Remove user from the list since they were passed
        setMatches((prev) => prev.filter((user) => user.id !== userId));

        showToast(`${userName}をパスしました`, "info");
        console.log("Successfully passed user:", userId);
      }
    } catch (error) {
      console.error("Error passing user:", error);
      showToast("パスの送信に失敗しました", "error");
    }
  };

  

  const handleViewProfile = (userId: string) => {
    console.log("View profile:", userId);
    // TODO: Navigate to profile screen
    showToast("プロフィール画面に移動します", "info");
  };

  const renderMatchCard = useCallback(({ item, index }: ListRenderItemInfo<User>) => (
    <ProfileCard
      profile={item}
      onLike={handleLike}
      onPass={handlePass}
      onViewProfile={handleViewProfile}
      testID={`MATCHING_SCREEN.CARD.${index}.${item.gender || "unknown"}`}
    />
  ), [handleLike, handlePass, handleViewProfile]);

  useEffect(() => {
    const loadViewerGender = async () => {
      const currentUserId = profileId || user?.id;
      if (!currentUserId) {
        setViewerGender("unknown");
        return;
      }

      try {
        const response = await DataProvider.getUser(currentUserId);
        if (response.success && response.data) {
          setViewerGender(response.data.gender || "unknown");
        }
      } catch (error) {
        console.error("Error loading viewer gender:", error);
        setViewerGender("unknown");
      }
    };

    loadViewerGender();
  }, [profileId, user?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>ユーザーを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      testID={`MATCHING_SCREEN.ROOT.${viewerGender || "unknown"}`}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>マッチング</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="更新"
        >
          <Ionicons name="refresh" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{matches.length}</Text>
          <Text style={styles.statLabel}>おすすめユーザー</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {matches.filter((user) => user.isLiked).length}
          </Text>
          <Text style={styles.statLabel}>いいね済み</Text>
        </View>
      </View>

      {/* Matches Grid */}
      <FlashList
        data={matches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.matchesList}
        showsVerticalScrollIndicator={false}
        testID={`MATCHING_SCREEN.RECOMMENDED_LIST.${viewerGender || "unknown"}`}
        drawDistance={screenWidth * 2}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={Colors.gray[400]} />
            <Text style={styles.emptyTitle}>新しいユーザーがいません</Text>
            <Text style={styles.emptySubtitle}>
              しばらく待ってから更新してみてください
            </Text>
            <TouchableOpacity
              style={styles.refreshButtonLarge}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>更新する</Text>
            </TouchableOpacity>
          </View>
        }
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
  headerTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  matchesList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  row: {
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  refreshButtonLarge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  refreshButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
});

export default MatchingScreen;
