import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { UserActivityService } from "../services/userActivityService";
import { UserListItem } from "../types/userActivity";
import EmptyState from "../components/EmptyState";
import StandardHeader from "../components/StandardHeader";

type FootprintsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const FootprintsScreen: React.FC = () => {
  const navigation = useNavigation<FootprintsScreenNavigationProp>();
  const { profileId } = useAuth();
  const { clearMyPageNotification } = useNotifications();
  const [footprintUsers, setFootprintUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Clear MyPage green dot notification and mark footprints as viewed when screen is focused
  useFocusEffect(
    useCallback(() => {
      clearMyPageNotification();
      // Mark footprints as viewed when user opens the screen
      const markAsViewed = async () => {
        const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
        if (currentUserId) {
          await UserActivityService.markFootprintsViewed(currentUserId);
          setUnreadCount(0);
        }
      };
      markAsViewed();
    }, [clearMyPageNotification, profileId])
  );

  // Load unread count for the badge
  const loadUnreadCount = async () => {
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (currentUserId) {
      const count = await UserActivityService.getFootprintCount(currentUserId);
      setUnreadCount(count);
    }
  };

  const handleMarkAllAsRead = async () => {
    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (currentUserId) {
      await UserActivityService.markFootprintsViewed(currentUserId);
      setUnreadCount(0);
    }
  };

  const loadFootprints = async () => {
    try {
      setLoading(true);
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        console.log('No user ID available');
        setLoading(false);
        return;
      }

      const footprints = await UserActivityService.getFootprints(currentUserId);
      setFootprintUsers(footprints);
    } catch (error) {
      console.error("Error loading footprints:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFootprints();
    loadUnreadCount();
  }, [profileId]);

  const handleUserPress = (user: UserListItem) => {
    navigation.navigate("Profile", { userId: user.id });
  };

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return "";

    // Handle PostgreSQL timestamp format (replace space with T for ISO format)
    const isoTimestamp = timestamp.replace(' ', 'T');
    const date = new Date(isoTimestamp);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return "たった今";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else {
      return `${diffInDays}日前`;
    }
  };

  const renderUserItem = ({ item }: { item: UserListItem }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.profileImage }} style={styles.userImage} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <View style={styles.userDetails}>
          {item.age && <Text style={styles.userDetail}>{item.age}歳</Text>}
          {item.location && (
            <Text style={styles.userDetail}>・{String(item.location)}</Text>
          )}
        </View>
      </View>
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="eye-off"
        size={48}
        color={Colors.gray[400]}
      />
      <Text style={styles.emptyTitle}>まだ足あとがありません</Text>
      <Text style={styles.emptySubtitle}>
        プロフィールを見た人がここに表示されます
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>足あとを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <StandardHeader
        title="足あと"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllText}>すべて既読</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Content */}
      <View style={styles.content}>
        {footprintUsers.length > 0 ? (
          <FlatList
            data={footprintUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: Spacing.sm,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  userDetail: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginRight: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  markAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  markAllText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.primary,
  },
});

export default FootprintsScreen;
