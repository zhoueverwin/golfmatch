import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import {
  Spacing,
  BorderRadius,
  Dimensions as AppDimensions,
  Shadows,
} from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import { RootStackParamList } from "../types";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Toast from "../components/Toast";
import ProfileCard from "../components/ProfileCard";
import { DataProvider, matchesService, messagesService } from "../services";
import { userInteractionService } from "../services/userInteractionService";
import { useAuth } from "../contexts/AuthContext";
import { getAgeRange, getSkillLevelText, calculateAge } from "../utils/formatters";

type LikesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width: screenWidth } = Dimensions.get("window");

const LikesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<LikesScreenNavigationProp>();
  const [selectedTab, setSelectedTab] = useState<"likes" | "matches">("likes");
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [profileCompletion] = useState(62);
  const [receivedLikes, setReceivedLikes] = useState<User[]>([]);
  const [matches, setMatches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactionState, setInteractionState] = useState(
    userInteractionService.getState(),
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

  // Staleness tracking - avoid unnecessary refetches on focus
  const lastFetchTime = useRef<number>(0);
  const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

  // Load received likes data
  const loadReceivedLikes = async () => {
    try {
      setLoading(true);

      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        console.error("No authenticated user. Cannot load received likes.");
        setReceivedLikes([]);
        setLikesCount(0);
        return;
      }
      const receivedLikesResponse =
        await DataProvider.getReceivedLikes(currentUserId);

      if (receivedLikesResponse.error) {
        console.error(
          "Failed to load received likes:",
          receivedLikesResponse.error,
        );
        setReceivedLikes([]);
        setLikesCount(0);
      } else {
        // Use optimized function that fetches likes with user profiles in single query
        const likesWithProfilesResponse = await matchesService.getLikesReceivedWithProfiles(
          currentUserId,
          50,
          0
        );

        if (likesWithProfilesResponse.success && likesWithProfilesResponse.data) {
          const usersWithDetails: User[] = likesWithProfilesResponse.data.map((row: any) => ({
            id: row.liker_id,
            legacy_id: '',
            user_id: row.liker_id,
            name: row.liker_name,
            age: row.liker_age,
            gender: 'other',
            location: '',
            prefecture: row.liker_prefecture,
            golf_skill_level: 'ビギナー',
            profile_pictures: row.liker_profile_pictures || [],
            is_verified: row.liker_is_verified || false,
            is_premium: row.liker_is_premium || false,
            last_login: '',
            last_active_at: '',
            created_at: '',
            updated_at: '',
            isLiked: false, // Users in received likes haven't been liked back yet
            isPassed: false,
            interactionType: undefined,
          }));

          setReceivedLikes(usersWithDetails);
          setLikesCount(usersWithDetails.length);
        } else {
          setReceivedLikes([]);
          setLikesCount(0);
        }
      }
    } catch (error) {
      console.error("Error loading received likes:", error);
      setReceivedLikes([]);
      setLikesCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load matches data
  const loadMatches = async () => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        console.error("No authenticated user. Cannot load matches.");
        setMatches([]);
        setMatchesCount(0);
        return;
      }

      const matchesResponse = await matchesService.getMatches(currentUserId);
      
      if (matchesResponse.success && matchesResponse.data) {
        const matchesData = matchesResponse.data;
        
        // Get user details for each match
        const userPromises = matchesData.map(async (match: any) => {
          // Determine which user is the other user
          const otherUserId = match.user1_id === currentUserId ? match.user2_id : match.user1_id;
          const otherUserData = match.user1_id === currentUserId ? match.user2 : match.user1;
          
          if (otherUserData) {
            // Ensure we use the UUID, not legacy_id
            const user: User = {
              ...otherUserData,
              id: otherUserId, // Force use the UUID from match table, not profile
              isLiked: true,
              isPassed: false,
              interactionType: "like" as const,
            };
            
            return user;
          }
          return null;
        });

        const usersWithDetails = (await Promise.all(userPromises)).filter(
          (u): u is User => u !== null,
        );

        setMatches(usersWithDetails);
        setMatchesCount(usersWithDetails.length);
      } else {
        setMatches([]);
        setMatchesCount(0);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
      setMatches([]);
      setMatchesCount(0);
    }
  };

  useEffect(() => {
    // Record initial fetch time
    lastFetchTime.current = Date.now();
    loadReceivedLikes();
    loadMatches();

    // Subscribe to interaction state changes
    const unsubscribe = userInteractionService.subscribe((state) => {
      setInteractionState(state);
    });

    // Load initial interaction state
    const currentUserId =
      user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID || "";
    if (currentUserId) {
      userInteractionService.loadUserInteractions(currentUserId);
    }

    return unsubscribe;
  }, []);

  // Refresh received likes and matches when screen comes into focus
  // Only refetch if data is stale (older than STALE_TIME_MS)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchTime.current > STALE_TIME_MS;
      
      if (isStale) {
        lastFetchTime.current = now;
        loadReceivedLikes();
        loadMatches();
      }
    }, []),
  );

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

  const handleLikeBack = async (userId: string) => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        showToast("ログインが必要です", "error");
        return;
      }
      const success = await userInteractionService.likeUser(
        currentUserId,
        userId,
      );

      if (!success) {
        showToast("いいねの送信に失敗しました", "error");
      } else {
        // Find user name for toast message
        const user = receivedLikes.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";

        // Update local state to reflect the like
        setReceivedLikes((prev) => {
          return prev.map((user) => {
            if (user.id === userId) {
              return {
                ...user,
                isLiked: true,
                interactionType: "like" as const,
              };
            }
            return user;
          });
        });

        showToast(`${userName}にいいねを送りました！`, "success");
      }
    } catch (error) {
      console.error("Error liking user:", error);
      showToast("いいねの送信に失敗しました", "error");
    }
  };

  const handlePass = async (userId: string) => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        showToast("ログインが必要です", "error");
        return;
      }
      const success = await userInteractionService.passUser(
        currentUserId,
        userId,
      );

      if (!success) {
        showToast("パスの送信に失敗しました", "error");
      } else {
        // Find user name for toast message
        const user = receivedLikes.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";

        // Remove user from the list since they were passed
        setReceivedLikes((prev) => prev.filter((user) => user.id !== userId));
        setLikesCount((prev) => Math.max(0, prev - 1));

        showToast(`${userName}をパスしました`, "info");
      }
    } catch (error) {
      console.error("Error passing user:", error);
      showToast("パスの送信に失敗しました", "error");
    }
  };

  

  const handleViewProfile = (userId: string) => {
    navigation.navigate("Profile", { userId });
  };

  const handleStartChat = async (userId: string, userName: string, userImage: string) => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        Alert.alert("エラー", "ログインが必要です");
        return;
      }

      // Get or create chat between the two users
      const chatResponse = await messagesService.getOrCreateChatBetweenUsers(
        currentUserId,
        userId
      );

      if (chatResponse.success && chatResponse.data) {
        // Navigate to chat screen
        navigation.navigate("Chat", {
          chatId: chatResponse.data,
          userId: userId,
          userName: userName,
          userImage: userImage || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
        });
      } else {
        Alert.alert("エラー", "チャットの作成に失敗しました: " + (chatResponse.error || "不明なエラー"));
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("エラー", "チャットの作成に失敗しました");
    }
  };

  const renderLikeItem = useCallback(({ item }: ListRenderItemInfo<User>) => {
    console.log(
      "🎨 Rendering ProfileCard for user:",
      item.id,
      "isLiked:",
      item.isLiked,
    );
    return (
      <ProfileCard
        profile={item}
        onLike={handleLikeBack}
        onPass={handlePass}

        onViewProfile={handleViewProfile}
      />
    );
  }, [handleLikeBack, handlePass, handleViewProfile]);

  const renderMatchItem = useCallback(({ item }: ListRenderItemInfo<User>) => {
    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => handleStartChat(
          item.id,
          item.name,
          item.profile_pictures?.[0] || ""
        )}
      >
        <Image
          source={{ uri: item.profile_pictures?.[0] || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face" }}
          style={styles.matchImage}
        />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{item.name}</Text>
          <Text style={styles.matchDetails}>
            {item.birth_date ? calculateAge(item.birth_date) : item.age}歳 • {item.prefecture || "未設定"}
          </Text>
          <Text style={styles.matchSkill}>
            {getSkillLevelText(item.golf_skill_level)}
          </Text>
        </View>
        <View style={styles.chatButton}>
          <Ionicons name="chatbubble" size={24} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }, [handleStartChat, getSkillLevelText]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>いいねを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>いいね</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "likes" && styles.activeTab]}
          onPress={() => setSelectedTab("likes")}
        >
          <Text style={[styles.tabText, selectedTab === "likes" && styles.activeTabText]}>
            いいね ({likesCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "matches" && styles.activeTab]}
          onPress={() => setSelectedTab("matches")}
        >
          <Text style={[styles.tabText, selectedTab === "matches" && styles.activeTabText]}>
            マッチ ({matchesCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Banner */}
      {selectedTab === "likes" && (
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{likesCount}</Text>
            <Text style={styles.statLabel}>もらったいいね</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileCompletion}%</Text>
            <Text style={styles.statLabel}>プロフィール充実度</Text>
          </View>
        </View>
      )}

      {/* Profile Completion Banner */}
      {selectedTab === "likes" && (
        <TouchableOpacity style={styles.completionBanner}>
          <Text style={styles.completionBannerText}>
            プロフィールを充実させてマッチング率アップ!
          </Text>
        </TouchableOpacity>
      )}

      {/* Received Likes List */}
      {selectedTab === "likes" && (
        <FlashList
          data={receivedLikes}
          renderItem={renderLikeItem}
          keyExtractor={(item) => `${item.id}-${item.isLiked}-${item.isPassed}`}
          numColumns={2}
          contentContainerStyle={styles.likesList}
          showsVerticalScrollIndicator={false}
          extraData={receivedLikes}
          drawDistance={screenWidth * 2}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="いいねがありません"
              subtitle="プロフィールを充実させて、いいねをもらいましょう"
              buttonTitle="プロフィールを編集"
              onButtonPress={() => navigation.navigate("EditProfile")}
            />
          }
        />
      )}

      {/* Matches List */}
      {selectedTab === "matches" && (
        <FlashList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => `match-${item.id}`}
          contentContainerStyle={styles.matchesList}
          showsVerticalScrollIndicator={false}
          extraData={matches}
          drawDistance={screenWidth * 2}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="マッチがありません"
              subtitle="いいねを送り合ってマッチしましょう！"
            />
          }
        />
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
  filterButton: {
    padding: Spacing.sm,
  },
  statsBanner: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
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
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  completionBanner: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  completionBannerText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
    textAlign: "center",
  },
  likesList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  row: {
    justifyContent: "space-between",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  matchesList: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  matchCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    ...Shadows.small,
  },
  matchImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  matchDetails: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  matchSkill: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  chatButton: {
    padding: Spacing.sm,
  },
});

export default LikesScreen;
