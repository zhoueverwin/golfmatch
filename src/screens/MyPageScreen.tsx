import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { UserProfile } from "../types/dataModels";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { DataProvider } from "../services";
import { supabaseDataProvider } from "../services/supabaseDataProvider";
import { UserActivityService } from "../services/userActivityService";
import { useNotifications } from "../contexts/NotificationContext";
// UserListModal import removed - now using screen navigation
import GolfCalendar from "../components/GolfCalendar";
import { UserListItem } from "../types/userActivity";

type MyPageScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const MyPageScreen: React.FC = () => {
  const navigation = useNavigation<MyPageScreenNavigationProp>();
  const { profileId } = useAuth(); // Get profileId from AuthContext
  const { unreadCount } = useNotifications(); // Get unread notification count from NotificationContext
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Activity data states
  const [footprintCount, setFootprintCount] = useState(0);
  const [pastLikesCount, setPastLikesCount] = useState(0);

  // Calculate profile completion percentage
  const calculateProfileCompletion = (profile: UserProfile | null) => {
    if (!profile) return 0;
    
    const fields = [
      // Basic info (40% weight)
      profile.basic?.name,
      profile.basic?.age,
      profile.basic?.gender,
      profile.basic?.prefecture,
      profile.basic?.blood_type,
      profile.basic?.height,
      profile.basic?.body_type,
      profile.basic?.smoking,
      
      // Golf info (40% weight)
      profile.golf?.skill_level,
      profile.golf?.experience,
      profile.golf?.average_score,
      profile.golf?.transportation,
      profile.golf?.play_fee,
      profile.golf?.available_days,
      
      // Bio and photos (20% weight)
      profile.bio,
      profile.profile_pictures?.length > 0,
    ];
    
    const filledFields = fields.filter(field => {
      if (typeof field === 'boolean') return field;
      return field && field.toString().trim() !== '' && field !== '0';
    }).length;
    
    return Math.round((filledFields / fields.length) * 100);
  };

  // Load user profile data
  const loadUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        console.log('No user ID available');
        setIsLoadingProfile(false);
        return;
      }

      const response = await DataProvider.getUserProfile(currentUserId);
      if (response.data) {
        setUserProfile(response.data);
        setUserName(response.data.basic.name);
        if (response.data.profile_pictures.length > 0) {
          setProfileImage(response.data.profile_pictures[0]);
        } else {
          setProfileImage(null);
        }
        // Calculate profile completion
        const completion = calculateProfileCompletion(response.data);
        setProfileCompletion(completion);
      }
    } catch (_error) {
      console.error("Error loading user profile:", _error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load activity data
  const loadActivityData = async () => {
    try {
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        console.log('No user ID available');
        return;
      }

      const [
        footprintCountResult,
        pastLikesCountResult,
        likesCountResult,
        statsResult,
      ] = await Promise.all([
        UserActivityService.getFootprintCount(currentUserId),
        UserActivityService.getPastLikesCount(currentUserId),
        supabaseDataProvider.getLikesReceivedCount(currentUserId),
        supabaseDataProvider.getConnectionStats(),
      ]);

      setFootprintCount(footprintCountResult);
      setPastLikesCount(pastLikesCountResult);
      
      if (likesCountResult.success && likesCountResult.data !== undefined) {
        setLikesCount(likesCountResult.data);
      }
      
      if (statsResult.success && statsResult.data) {
        setMatchesCount(statsResult.data.matches);
      }
    } catch (_error) {
      console.error("Error loading activity data:", _error);
    }
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    if (profileId) {
      loadUserProfile();
      loadActivityData();
    }
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      if (profileId) {
        loadUserProfile();
        loadActivityData();
      }
    }, [profileId]),
  );

  // Handlers
  const handleFootprintPress = () => {
    navigation.navigate("Footprints");
  };

  const handlePastLikesPress = () => {
    navigation.navigate("PastLikes");
  };

  const handleCalendarPress = () => {
    navigation.navigate("CalendarEdit");
  };

  // Remove handleUserPress as it's no longer needed

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {isLoadingProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>プロフィールを読み込み中...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header with プロフィール表示 */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", { userId: profileId || process.env.EXPO_PUBLIC_TEST_USER_ID || "default" })
              }
              style={styles.headerLeftContainer}
            >
              <Image 
                source={require("../../assets/images/Icons/Profile-Outline.png")} 
                style={styles.headerProfileIcon}
              />
              <Text style={styles.headerTitle}>プロフィール表示</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("EditProfile")}
              style={styles.editIconButton}
            >
              <Image 
                source={require("../../assets/images/Icons/Edit.png")} 
                style={styles.editIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Profile Section with Gradient Background */}
          <LinearGradient
            colors={['#21B2AA54', '#21B2AA00', '#21B2AA00']}
            locations={[0, 0.33, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.profileSection}
          >
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", { userId: profileId || process.env.EXPO_PUBLIC_TEST_USER_ID || "default" })
              }
              style={styles.profileImageContainer}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={64} color={Colors.text.secondary} />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.profileName}>{userName || "ユーザー"}</Text>

            <Text style={styles.completionText}>
              プロフィール充実度: {profileCompletion}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${profileCompletion}%` },
                ]}
              />
            </View>

            <Text style={styles.completionMessage}>
              プロフィールを充実させてマッチング率アップ！
            </Text>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{matchesCount}</Text>
              <Text style={styles.statLabel}>つながり</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber} testID="MYPAGE_SCREEN.LIKES_COUNT">
                {likesCount}
              </Text>
              <Text style={styles.statLabel}>いいね</Text>
            </View>

            <TouchableOpacity 
              style={[styles.statCard, styles.storeCard]}
              onPress={() => navigation.navigate("Store")}
              testID="MYPAGE_SCREEN.STORE_CARD"
            >
              <Image 
                source={require("../../assets/images/Icons/Plan01.png")} 
                style={styles.storeIcon}
              />
              <Text style={styles.storeLabel}>ストア</Text>
            </TouchableOpacity>
          </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleFootprintPress}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Footprint.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>足あと</Text>
            </View>
            <View style={styles.menuItemRight}>
              {footprintCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{footprintCount}</Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePastLikesPress}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Like.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>過去のいいね</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCalendarPress}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Calendar.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>カレンダー</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("NotificationHistory")}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Notifications.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>お知らせ</Text>
            </View>
            <View style={styles.menuItemRight}>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("ContactReply")}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Contact.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>お問い合わせ</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Settings")}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Settings.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>設定</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Help")}
          >
            <View style={styles.menuItemLeft}>
              <Image 
                source={require("../../assets/images/Icons/Help.png")} 
                style={styles.menuIcon}
                resizeMode="contain"
              />
              <Text style={styles.menuItemText}>ヘルプ</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.gray[400]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      )}

      {/* Modals */}
      {/* Modals removed - now using screen navigation */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerProfileIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.primary,
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.primary,
  },
  editIconButton: {
    padding: 4,
  },
  editIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.text.secondary,
  },
  profileSection: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  profileImageContainer: {
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    backgroundColor: Colors.gray[200],
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "500",
    fontFamily: Typography.getFontFamily("500"),
    color: "#131313",
    marginBottom: 6,
  },
  completionText: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 4,
    fontWeight: Typography.fontWeight.normal,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    width: "80%",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  completionMessage: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 8,
    fontFamily: Typography.getFontFamily("700"),
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  storeCard: {
    backgroundColor: Colors.primary,
  },
  storeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  storeIcon: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  storeLabel: {
    fontSize: 10,
    color: Colors.white,
    textAlign: "center",
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 12,
  },
  menuContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: 100,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray[100],
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: 24,
  },
  menuIcon: {
    width: 18,
    height: 18,
    tintColor: Colors.primary,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.normal),
    color: Colors.text.primary,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: Spacing.xs,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
});

export default MyPageScreen;
