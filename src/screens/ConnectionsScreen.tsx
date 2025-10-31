import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import { DataProvider, matchesService, messagesService } from "../services";
import { userInteractionService } from "../services/userInteractionService";
import { useAuth } from "../contexts/AuthContext";

interface ConnectionItem {
  id: string;
  type: "like" | "match";
  profile: User;
  timestamp: string;
  isNew?: boolean;
  hasLikedBack?: boolean;
}

type ConnectionsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ConnectionsScreen: React.FC = () => {
  const navigation = useNavigation<ConnectionsScreenNavigationProp>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"like" | "match">("like");
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [likedBackUsers, setLikedBackUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load received likes
  const loadReceivedLikes = async () => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) return;

      console.log('[ConnectionsScreen] Loading received likes for user:', currentUserId);
      const response = await DataProvider.getReceivedLikes(currentUserId);
      
      if (response.success && response.data) {
        const likesData = response.data;
        
        // Get current user's likes to check if they've already liked back
        const currentUserLikesResponse = await DataProvider.getUserLikes(currentUserId);
        const currentUserLikes = currentUserLikesResponse.success ? currentUserLikesResponse.data || [] : [];
        
        const userPromises = likesData.map(async (like) => {
          const userResponse = await DataProvider.getUserById(like.liker_user_id);
          if (userResponse.data) {
            // Check if current user has already liked this user back
            const hasLikedBack = currentUserLikes.some(
              (userLike: any) => userLike.liked_user_id === like.liker_user_id && userLike.type === 'like'
            );
            
            return {
              id: like.id,
              type: "like" as const,
              profile: { ...userResponse.data, id: like.liker_user_id }, // Force UUID
              timestamp: new Date(like.created_at).toLocaleDateString('ja-JP'),
              isNew: true,
              hasLikedBack, // Add this flag to track if user has already liked back
            };
          }
          return null;
        });
        
        const likes = (await Promise.all(userPromises)).filter((item): item is ConnectionItem => item !== null);
        console.log('[ConnectionsScreen] Loaded received likes:', likes.length);
        return likes;
      }
      return [];
    } catch (error) {
      console.error('[ConnectionsScreen] Error loading likes:', error);
      return [];
    }
  };

  // Load matches
  const loadMatches = async () => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) return;

      console.log('[ConnectionsScreen] Loading matches for user:', currentUserId);
      const response = await matchesService.getMatches(currentUserId);
      
      if (response.success && response.data) {
        const matchesData = response.data.map((match: any) => {
          const otherUserId = match.user1_id === currentUserId ? match.user2_id : match.user1_id;
          const otherUserData = match.user1_id === currentUserId ? match.user2 : match.user1;
          
          return {
            id: match.id,
            type: "match" as const,
            profile: { ...otherUserData, id: otherUserId }, // Force UUID
            timestamp: new Date(match.matched_at).toLocaleDateString('ja-JP'),
            isNew: false,
          };
        });
        
        console.log('[ConnectionsScreen] Loaded matches:', matchesData.length);
        return matchesData;
      }
      return [];
    } catch (error) {
      console.error('[ConnectionsScreen] Error loading matches:', error);
      return [];
    }
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    const [likes, matches] = await Promise.all([loadReceivedLikes(), loadMatches()]);
    setConnections([...likes, ...matches]);
    setLikesCount(likes.length);
    setMatchesCount(matches.length);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload on focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

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

  const handleLikeBack = async (profileId: string) => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) return;

      // Check if user has already liked back
      const connectionItem = connections.find(item => item.profile.id === profileId);
      if (connectionItem?.hasLikedBack) {
        console.log('[ConnectionsScreen] User has already liked back, skipping');
        return;
      }

      console.log('[ConnectionsScreen] Liking back user:', profileId);
      
      // Add to liked back users for UI state
      setLikedBackUsers((prev) => new Set(prev).add(profileId));

      // Send like to the database - returns boolean, not object
      const success = await userInteractionService.likeUser(currentUserId, profileId);
      
      if (success) {
        // Reload data to reflect the match
        setTimeout(async () => {
          await loadData();
          // Remove from liked back users after reload
          setLikedBackUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(profileId);
            return newSet;
          });
        }, 1000);
      } else {
        Alert.alert("エラー", "いいねの送信に失敗しました");
        setLikedBackUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(profileId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('[ConnectionsScreen] Error liking back:', error);
      Alert.alert("エラー", "いいねの送信に失敗しました");
      setLikedBackUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(profileId);
        return newSet;
      });
    }
  };


  const handleStartChat = async (profileId: string) => {
    try {
      console.log('[ConnectionsScreen] Starting chat with user:', profileId);
      
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        Alert.alert("エラー", "ログインが必要です");
        return;
      }

      // Find the user profile from connections
      const userProfile = connections.find(
        (item) => item.profile.id === profileId,
      )?.profile;
      
      if (!userProfile) {
        Alert.alert("エラー", "ユーザー情報が見つかりません");
        return;
      }

      // Get or create chat between the two users
      const chatResponse = await messagesService.getOrCreateChatBetweenUsers(
        currentUserId,
        profileId
      );

      console.log('[ConnectionsScreen] Chat response:', {
        success: chatResponse.success,
        chatId: chatResponse.data,
        error: chatResponse.error
      });

      if (chatResponse.success && chatResponse.data) {
        navigation.navigate("Chat", {
          chatId: chatResponse.data,
          userId: profileId,
          userName: userProfile.name,
          userImage: userProfile.profile_pictures?.[0] || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
        });
      } else {
        Alert.alert("エラー", "チャットの作成に失敗しました: " + (chatResponse.error || "不明なエラー"));
      }
    } catch (error) {
      console.error("[ConnectionsScreen] Error starting chat:", error);
      Alert.alert("エラー", "チャットの作成に失敗しました");
    }
  };

  const handleViewProfile = (profileId: string) => {
    console.log('[ConnectionsScreen] Viewing profile for user:', profileId);
    navigation.navigate("Profile", { userId: profileId });
  };

  const filteredConnections = connections.filter(
    (item) => item.type === activeTab,
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>つながり</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderConnectionItem = ({ item }: { item: ConnectionItem }) => (
    <Card style={styles.connectionItem} shadow="small">
      <View style={styles.itemHeader}>
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => handleViewProfile(item.profile.id)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.profile.profile_pictures[0] }}
            style={styles.profileImage}
            accessibilityLabel={`${item.profile.name}のプロフィール写真`}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{item.profile.name}</Text>
              {item.profile.is_verified && (
                <View style={styles.verificationBadge}>
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                </View>
              )}
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.ageLocation}>
              {getAgeRange(item.profile.age)}・{item.profile.prefecture}
            </Text>
            <Text style={styles.skillLevel}>
              {getSkillLevelText(item.profile.golf_skill_level)}
            </Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        {item.type === "like" ? (
          <Button
            title={
              item.hasLikedBack || likedBackUsers.has(item.profile.id)
                ? "いいね済み"
                : "いいね返し"
            }
            onPress={() => handleLikeBack(item.profile.id)}
            variant={
              item.hasLikedBack || likedBackUsers.has(item.profile.id) ? "secondary" : "primary"
            }
            size="small"
            style={styles.singleActionButton}
            disabled={item.hasLikedBack || likedBackUsers.has(item.profile.id)}
            loading={likedBackUsers.has(item.profile.id)}
          />
        ) : (
          <Button
            title="チャットを始める"
            onPress={() => handleStartChat(item.profile.id)}
            variant="primary"
            size="small"
            style={styles.matchButton}
          />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>つながり</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "like" && styles.activeTab]}
          onPress={() => setActiveTab("like")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "like" && styles.activeTabText,
            ]}
          >
            いいね {likesCount > 0 && `(${likesCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "match" && styles.activeTab]}
          onPress={() => setActiveTab("match")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "match" && styles.activeTabText,
            ]}
          >
            マッチ {matchesCount > 0 && `(${matchesCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Connections List */}
      <FlatList
        data={filteredConnections}
        renderItem={renderConnectionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.connectionsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === "like" ? "heart-outline" : "people-outline"}
            title={
              activeTab === "like" ? "いいねがありません" : "マッチがありません"
            }
            subtitle={
              activeTab === "like"
                ? "プロフィールを充実させて、いいねをもらいましょう"
                : "いいねを送って、マッチを増やしましょう"
            }
            buttonTitle="プロフィールを探す"
            onButtonPress={() => console.log("Go to search")}
          />
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs,
  },
  activeTab: {
    backgroundColor: Colors.primary + "20",
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray[600],
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  connectionsList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  connectionItem: {
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    marginBottom: Spacing.md,
  },
  profileSection: {
    flexDirection: "row",
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  profileName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginRight: Spacing.xs,
  },
  verificationBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
  },
  newBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  newBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  ageLocation: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  skillLevel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  singleActionButton: {
    flex: 1,
  },
  matchButton: {
    flex: 1,
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
});

export default ConnectionsScreen;
