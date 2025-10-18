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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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

interface ConnectionItem {
  id: string;
  type: "like" | "match";
  profile: User;
  timestamp: string;
  isNew?: boolean;
}

type ConnectionsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ConnectionsScreen: React.FC = () => {
  const navigation = useNavigation<ConnectionsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<"like" | "match">("like");
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [likedBackUsers, setLikedBackUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Mock data for development
    const mockConnections: ConnectionItem[] = [
      {
        id: "1",
        type: "like",
        profile: {
          id: "1",
          legacy_id: "1",
          user_id: "1",
          name: "Mii",
          age: 25,
          gender: "female",
          location: "群馬県",
          prefecture: "群馬県",
          golf_skill_level: "beginner",
          profile_pictures: [
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
          ],
          is_verified: false,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        timestamp: "2時間前",
        isNew: true,
      },
      {
        id: "2",
        type: "like",
        profile: {
          id: "2",
          legacy_id: "2",
          user_id: "2",
          name: "Yuki",
          age: 28,
          gender: "female",
          location: "千葉県",
          prefecture: "千葉県",
          golf_skill_level: "intermediate",
          profile_pictures: [
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
          ],
          is_verified: true,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        timestamp: "5時間前",
        isNew: true,
      },
      {
        id: "3",
        type: "match",
        profile: {
          id: "3",
          legacy_id: "3",
          user_id: "3",
          name: "Sakura",
          age: 23,
          gender: "female",
          location: "東京都",
          prefecture: "東京都",
          golf_skill_level: "beginner",
          profile_pictures: [
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
          ],
          is_verified: false,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        timestamp: "1日前",
        isNew: false,
      },
      {
        id: "4",
        type: "match",
        profile: {
          id: "4",
          legacy_id: "4",
          user_id: "4",
          name: "Aoi",
          age: 26,
          gender: "female",
          location: "神奈川県",
          prefecture: "神奈川県",
          golf_skill_level: "advanced",
          profile_pictures: [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
          ],
          is_verified: true,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        timestamp: "2日前",
        isNew: false,
      },
    ];

    setConnections(mockConnections);
    setLikesCount(2);
    setMatchesCount(2);
  }, []);

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

  const handleLikeBack = (profileId: string) => {
    // Add to liked back users for UI state
    setLikedBackUsers((prev) => new Set(prev).add(profileId));

    // Update the connection to move from like to match
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((item) =>
          item.profile.id === profileId && item.type === "like"
            ? { ...item, type: "match", isNew: false }
            : item,
        ),
      );

      // Update counts
      const likeCount = connections.filter(
        (item) => item.type === "like" && item.profile.id !== profileId,
      ).length;
      const matchCount = connections.filter(
        (item) => item.type === "match" || item.profile.id === profileId,
      ).length;
      setLikesCount(likeCount);
      setMatchesCount(matchCount);

      // Remove from liked back users after animation
      setTimeout(() => {
        setLikedBackUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(profileId);
          return newSet;
        });
      }, 1000);
    }, 500);
  };

  const handlePass = (profileId: string, profileName: string) => {
    Alert.alert(
      "ユーザーを削除",
      `${profileName}さんをリストから削除しますか？`,
      [
        {
          text: "キャンセル",
          style: "cancel",
        },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => {
            // Remove user from connections
            setConnections((prev) =>
              prev.filter((item) => item.profile.id !== profileId),
            );
            // Update counts
            const likeCount = connections.filter(
              (item) => item.type === "like" && item.profile.id !== profileId,
            ).length;
            const matchCount = connections.filter(
              (item) => item.type === "match" && item.profile.id !== profileId,
            ).length;
            setLikesCount(likeCount);
            setMatchesCount(matchCount);
          },
        },
      ],
    );
  };

  const handleStartChat = (profileId: string) => {
    console.log("Start chat:", profileId);
    // Find the user profile from connections
    const userProfile = connections.find(
      (item) => item.profile.id === profileId,
    )?.profile;
    if (userProfile) {
      navigation.navigate("Chat", {
        userId: profileId,
        userName: userProfile.name,
        userImage: userProfile.profile_pictures[0],
      });
    }
  };

  const handleViewProfile = (profileId: string) => {
    console.log("View profile:", profileId);
    navigation.navigate("Profile", { userId: profileId });
  };

  const filteredConnections = connections.filter(
    (item) => item.type === activeTab,
  );

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
          <>
            <Button
              title="パス"
              onPress={() => handlePass(item.profile.id, item.profile.name)}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title={
                likedBackUsers.has(item.profile.id)
                  ? "マッチしました！"
                  : "いいね返し"
              }
              onPress={() => handleLikeBack(item.profile.id)}
              variant={
                likedBackUsers.has(item.profile.id) ? "secondary" : "primary"
              }
              size="small"
              style={styles.actionButton}
              disabled={likedBackUsers.has(item.profile.id)}
              loading={likedBackUsers.has(item.profile.id)}
            />
          </>
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
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
  matchButton: {
    flex: 1,
  },
});

export default ConnectionsScreen;
