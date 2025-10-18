import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from "react-native";
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
import { debugDataProvider } from "../utils/debugDataProvider";

type LikesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

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

  // Load received likes data
  const loadReceivedLikes = async () => {
    try {
      setLoading(true);

      console.log("🔍 Loading received likes from DataProvider...");
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
        const receivedLikesData = receivedLikesResponse.data || [];
        console.log(
          "👥 Found received likes:",
          receivedLikesData.map((like) => ({
            liker_user_id: like.liker_user_id,
            type: like.type,
          })),
        );

        // Get user details for each received like
        const userPromises = receivedLikesData.map(async (like) => {
          const userResponse = await DataProvider.getUserById(
            like.liker_user_id,
          );
          if (userResponse.data) {
            const user: User = {
              ...userResponse.data,
              isLiked: false, // Users in received likes haven't been liked back yet
              isSuperLiked: false,
              isPassed: false,
              interactionType: undefined,
            };
            return user;
          }
          return null;
        });

        const usersWithDetails = (await Promise.all(userPromises)).filter(
          (u): u is User => u !== null,
        );
        console.log(
          "✅ Set received likes users:",
          usersWithDetails.map((u) => ({
            id: u.id,
            name: u.name,
            isLiked: u.isLiked,
          })),
        );

        setReceivedLikes(usersWithDetails);
        setLikesCount(usersWithDetails.length);
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

      console.log('[LikesScreen] Loading matches for user:', currentUserId);
      const matchesResponse = await matchesService.getMatches(currentUserId);
      
      console.log('[LikesScreen] Matches response:', {
        success: matchesResponse.success,
        count: matchesResponse.data?.length,
        matches: matchesResponse.data?.map((m: any) => ({
          match_id: m.id,
          user1_id: m.user1_id,
          user2_id: m.user2_id,
          other_user: m.user1_id === currentUserId ? m.user2?.name : m.user1?.name
        }))
      });
      
      if (matchesResponse.success && matchesResponse.data) {
        const matchesData = matchesResponse.data;
        
        // Get user details for each match
        const userPromises = matchesData.map(async (match: any) => {
          // Determine which user is the other user
          const otherUserId = match.user1_id === currentUserId ? match.user2_id : match.user1_id;
          const otherUserData = match.user1_id === currentUserId ? match.user2 : match.user1;
          
          console.log('[LikesScreen] Processing match:', {
            match_id: match.id,
            otherUserId,
            otherUserData_id: otherUserData?.id,
            otherUserData_legacy_id: otherUserData?.legacy_id,
            otherUserData_name: otherUserData?.name
          });
          
          if (otherUserData) {
            // CRITICAL FIX: Ensure we use the UUID, not legacy_id
            const user: User = {
              ...otherUserData,
              id: otherUserId, // Force use the UUID from match table, not profile
              isLiked: true,
              isSuperLiked: false,
              isPassed: false,
              interactionType: "like" as const,
            };
            
            console.log('[LikesScreen] Created user object:', {
              id: user.id,
              name: user.name,
              legacy_id: (user as any).legacy_id
            });
            
            return user;
          }
          return null;
        });

        const usersWithDetails = (await Promise.all(userPromises)).filter(
          (u): u is User => u !== null,
        );

        console.log('[LikesScreen] マッチ tab users:', usersWithDetails.map(u => ({
          id: u.id,
          name: u.name
        })));

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
    // Debug DataProvider first
    debugDataProvider();
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
  useFocusEffect(
    useCallback(() => {
      loadReceivedLikes();
      loadMatches();
    }, []),
  );

  // Helper function to show toast
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    console.log("🍞 showToast called:", { message, type });
    setToast({
      visible: true,
      message,
      type,
    });
    console.log("🍞 Toast state updated");
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const getAgeRange = (age: number): string => {
    if (age < 25) return "20代前半";
    if (age < 30) return "20代後半";
    if (age < 35) return "30代前半";
    if (age < 40) return "30代後半";
    if (age < 45) return "40代前半";
    if (age < 50) return "40代後半";
    return "50代以上";
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

  const handleLikeBack = async (userId: string) => {
    console.log("🔥 handleLikeBack called with userId:", userId);
    try {
      console.log("📞 Calling userInteractionService.likeUser...");
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        showToast("ログインが必要です", "error");
        return;
      }
      const success = await userInteractionService.likeUser(
        currentUserId,
        userId,
      );
      console.log("📥 Interaction service response:", success);

      if (!success) {
        console.error("❌ Failed to like user");
        showToast("いいねの送信に失敗しました", "error");
      } else {
        console.log("✅ Like successful, updating UI...");
        // Find user name for toast message
        const user = receivedLikes.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";
        console.log("👤 User name for toast:", userName);

        // Update local state to reflect the like
        setReceivedLikes((prev) => {
          const updated = prev.map((user) => {
            if (user.id === userId) {
              const newUser = {
                ...user,
                isLiked: true,
                interactionType: "like" as const,
              };
              console.log(
                "🔄 Updated user:",
                newUser.id,
                "isLiked:",
                newUser.isLiked,
              );
              return newUser;
            }
            return user;
          });
          console.log("🔄 Updated receivedLikes array length:", updated.length);
          return updated;
        });

        console.log("🍞 Showing toast message...");
        showToast(`${userName}にいいねを送りました！`, "success");
        console.log("✅ Successfully liked user:", userId);
      }
    } catch (error) {
      console.error("💥 Error liking user:", error);
      showToast("いいねの送信に失敗しました", "error");
    }
  };

  const handlePass = async (userId: string) => {
    console.log("🔥 handlePass called with userId:", userId);
    try {
      console.log("📞 Calling userInteractionService.passUser...");
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        showToast("ログインが必要です", "error");
        return;
      }
      const success = await userInteractionService.passUser(
        currentUserId,
        userId,
      );
      console.log("📥 Interaction service response:", success);

      if (!success) {
        console.error("❌ Failed to pass user");
        showToast("パスの送信に失敗しました", "error");
      } else {
        console.log("✅ Pass successful, updating UI...");
        // Find user name for toast message
        const user = receivedLikes.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";
        console.log("👤 User name for toast:", userName);

        // Remove user from the list since they were passed
        setReceivedLikes((prev) => {
          const filtered = prev.filter((user) => user.id !== userId);
          console.log("🔄 Updated receivedLikes (filtered):", filtered);
          return filtered;
        });
        setLikesCount((prev) => {
          const newCount = Math.max(0, prev - 1);
          console.log("📊 Updated likes count:", newCount);
          return newCount;
        });

        console.log("🍞 Showing toast message...");
        showToast(`${userName}をパスしました`, "info");
        console.log("✅ Successfully passed user:", userId);
      }
    } catch (error) {
      console.error("💥 Error passing user:", error);
      showToast("パスの送信に失敗しました", "error");
    }
  };

  const handleSuperLike = async (userId: string) => {
    console.log("🔥 handleSuperLike called with userId:", userId);
    try {
      console.log("📞 Calling userInteractionService.superLikeUser...");
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        showToast("ログインが必要です", "error");
        return;
      }
      const success = await userInteractionService.superLikeUser(
        currentUserId,
        userId,
      );
      console.log("📥 Interaction service response:", success);

      if (!success) {
        console.error("❌ Failed to super like user");
        showToast("スーパーいいねの送信に失敗しました", "error");
      } else {
        console.log("✅ Super like successful, updating UI...");
        // Find user name for toast message
        const user = receivedLikes.find((u) => u.id === userId);
        const userName = user?.name || "ユーザー";
        console.log("👤 User name for toast:", userName);

        // Update local state to reflect the super like
        setReceivedLikes((prev) => {
          const updated = prev.map((user) => {
            if (user.id === userId) {
              const newUser = {
                ...user,
                isSuperLiked: true,
                interactionType: "super_like" as const,
              };
              console.log(
                "🔄 Updated user:",
                newUser.id,
                "isSuperLiked:",
                newUser.isSuperLiked,
              );
              return newUser;
            }
            return user;
          });
          console.log("🔄 Updated receivedLikes array length:", updated.length);
          return updated;
        });

        console.log("🍞 Showing toast message...");
        showToast(`${userName}にスーパーいいねを送りました！✨`, "success");
        console.log("✅ Successfully super liked user:", userId);
      }
    } catch (error) {
      console.error("💥 Error super liking user:", error);
      showToast("スーパーいいねの送信に失敗しました", "error");
    }
  };

  const handleViewProfile = (userId: string) => {
    console.log("🔥 handleViewProfile called with userId:", userId);
    console.log('[LikesScreen] Navigating to profile with UUID:', userId);
    navigation.navigate("Profile", { userId });
  };

  const handleStartChat = async (userId: string, userName: string, userImage: string) => {
    try {
      console.log('[LikesScreen] Starting chat with user:', {
        userId,
        userName,
        userImage
      });
      
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        Alert.alert("エラー", "ログインが必要です");
        return;
      }

      console.log('[LikesScreen] Current user:', currentUserId);

      // Get or create chat between the two users
      const chatResponse = await messagesService.getOrCreateChatBetweenUsers(
        currentUserId,
        userId
      );

      console.log('[LikesScreen] Chat response:', {
        success: chatResponse.success,
        chatId: chatResponse.data,
        error: chatResponse.error
      });

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
      console.error("[LikesScreen] Error starting chat:", error);
      Alert.alert("エラー", "チャットの作成に失敗しました");
    }
  };

  const renderLikeItem = ({ item }: { item: User }) => {
    console.log(
      "🎨 Rendering ProfileCard for user:",
      item.id,
      "isLiked:",
      item.isLiked,
      "isSuperLiked:",
      item.isSuperLiked,
    );
    return (
      <ProfileCard
        profile={item}
        onLike={handleLikeBack}
        onPass={handlePass}
        onSuperLike={handleSuperLike}
        onViewProfile={handleViewProfile}
      />
    );
  };

  const renderMatchItem = ({ item }: { item: User }) => {
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
            {item.age}歳 • {item.prefecture || "未設定"}
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
  };

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
        <FlatList
          data={receivedLikes}
          renderItem={renderLikeItem}
          keyExtractor={(item) =>
            `${item.id}-${item.isLiked}-${item.isSuperLiked}-${item.isPassed}`
          }
          numColumns={2}
          contentContainerStyle={styles.likesList}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          extraData={receivedLikes}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="いいねがありません"
              subtitle="プロフィールを充実させて、いいねをもらいましょう"
              buttonTitle="プロフィールを編集"
              onButtonPress={() => console.log("Edit profile")}
            />
          }
        />
      )}

      {/* Matches List */}
      {selectedTab === "matches" && (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => `match-${item.id}`}
          contentContainerStyle={styles.matchesList}
          showsVerticalScrollIndicator={false}
          extraData={matches}
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
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  matchDetails: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  matchSkill: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  chatButton: {
    padding: Spacing.sm,
  },
});

export default LikesScreen;
