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
            
            // Check if the like was created within the last 24 hours
            const likeCreatedAt = new Date(like.created_at);
            const now = new Date();
            const hoursSinceLike = (now.getTime() - likeCreatedAt.getTime()) / (1000 * 60 * 60);
            const isNew = hoursSinceLike <= 24;
            
            return {
              id: like.id,
              type: "like" as const,
              profile: { ...userResponse.data, id: like.liker_user_id }, // Force UUID
              timestamp: new Date(like.created_at).toLocaleDateString('ja-JP'),
              isNew: isNew,
              hasLikedBack: hasLikedBack,
            } as ConnectionItem;
          }
          return null;
        });
        
        const likes = (await Promise.all(userPromises)).filter((item): item is ConnectionItem => item !== null && item.type === "like") as ConnectionItem[];
        return likes;
      }
      return [];
    } catch (error) {
      console.error('[ConnectionsScreen] Error loading likes:', error);
      return [];
    }
  };

  // Load matches
  const loadMatches = async (): Promise<ConnectionItem[]> => {
    try {
      const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) return [];

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
    const allConnections: ConnectionItem[] = [...(likes as ConnectionItem[] || []), ...(matches || [])];
    setConnections(allConnections);
    setLikesCount((likes || []).length);
    setMatchesCount((matches || []).length);
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
    if (age < 30) return "20代";
    if (age < 40) return "30代";
    if (age < 50) return "40代";
    return "50代";
  };

  const getSkillLevelText = (level: string | null | undefined): string => {
    if (!level) return "未設定";
    
    switch (level) {
      // Japanese values (from database)
      case "ビギナー":
        return "ビギナー";
      case "中級者":
        return "中級者";
      case "上級者":
        return "上級者";
      case "プロ":
        return "プロ";
      // English values (for backward compatibility)
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
        return;
      }
      
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
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "like" && styles.activeTab]}
              onPress={() => setActiveTab("like")}
            >
              <Text
                style={[styles.tabText, activeTab === "like" && styles.activeTabText]}
              >
                {`いいね${likesCount > 0 ? `(${likesCount})` : ""}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "match" && styles.activeTab]}
              onPress={() => setActiveTab("match")}
            >
              <Text
                style={[styles.tabText, activeTab === "match" && styles.activeTabText]}
              >
                {`マッチ${matchesCount > 0 ? `(${matchesCount})` : ""}`}
              </Text>
            </TouchableOpacity>
          </View>
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
      <View style={styles.row}>
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
              <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                {item.profile.name}
              </Text>
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.ageLocation} numberOfLines={2}>
              {item.profile.prefecture}・{getAgeRange(item.profile.age)} {item.timestamp}
            </Text>
          </View>
        </TouchableOpacity>

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
            style={styles.actionPill}
            disabled={item.hasLikedBack || likedBackUsers.has(item.profile.id)}
            loading={likedBackUsers.has(item.profile.id)}
          />
        ) : (
          <Button
            title="メッセージを送る"
            onPress={() => handleStartChat(item.profile.id)}
            variant="primary"
            size="small"
            style={styles.actionPill}
          />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
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
              {`いいね${likesCount > 0 ? `(${likesCount})` : ""}`}
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
              {`マッチ${matchesCount > 0 ? `(${matchesCount})` : ""}`}
            </Text>
          </TouchableOpacity>
          </View>
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
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
    marginRight: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.gray[500],
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
  },
  connectionsList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  connectionItem: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginRight: Spacing.xs,
    flex: 1,
    flexShrink: 1,
  },
  verificationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(32,178,170,0.85)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginRight: Spacing.xs,
  },
  verificationText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  newBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.xs,
  },
  newBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  ageLocation: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 14,
    marginTop: 2,
  },
  actionPill: {
    width: 168,
    minWidth: 168,
    maxWidth: 168,
    marginLeft: Spacing.sm,
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
