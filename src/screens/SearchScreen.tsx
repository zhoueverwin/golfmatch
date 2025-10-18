import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
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
import { User, SearchFilters } from "../types/dataModels";
import ProfileCard from "../components/ProfileCard";
import FilterModal from "../components/FilterModal";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import { DataProvider } from "../services";
import { useAuth } from "../contexts/AuthContext";
import { userInteractionService } from "../services/userInteractionService";

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { user, profileId } = useAuth(); // Get profileId from AuthContext
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommended" | "registration">(
    "recommended",
  );
  const [filters, setFilters] = useState<SearchFilters>({});

  // Load recommended users when profileId becomes available
  useEffect(() => {
    if (profileId) {
      console.log("📱 SearchScreen: profileId loaded, fetching users...", profileId);
      // Load user interactions first
      userInteractionService.loadUserInteractions(profileId);
      loadRecommendedUsers();
    } else {
      console.log("⏳ SearchScreen: Waiting for profileId to load...");
    }
  }, [profileId]); // Re-run when profileId changes

  const handleLike = async (userId: string) => {
    console.log("🔥 handleLike called for user:", userId);
    console.log("🔥 Current profileId:", profileId);
    console.log("🔥 Target userId:", userId);
    try {
      const currentUserId = profileId; // Use profileId (UUID) instead of user.id (auth ID)
      if (!currentUserId) {
        console.error("No current profileId available");
        Alert.alert("エラー", "ログインが必要です");
        return;
      }
      console.log("📞 Calling DataProvider.likeUser with:", { currentUserId, userId });
      const response = await DataProvider.likeUser(currentUserId, userId);
      console.log("📥 Response from likeUser:", response);

      if (response.error) {
        Alert.alert("エラー", response.error);
        return;
      }

      console.log("✅ Like successful:", response.data);
      // Update the UI state
      setProfiles((prevProfiles) =>
        prevProfiles.map((profile) =>
          profile.id === userId
            ? {
                ...profile,
                isLiked: true,
                isPassed: false,
                interactionType: "like",
              }
            : profile,
        ),
      );
    } catch (error) {
      console.error("❌ Error liking user:", error);
      Alert.alert("エラー", "いいねの送信に失敗しました");
    }
  };

  const handlePass = async (userId: string) => {
    console.log("🔥 handlePass called for user:", userId);
    try {
      const currentUserId = profileId; // Use profileId (UUID) instead of user.id (auth ID)
      if (!currentUserId) {
        console.error("No current profileId available");
        Alert.alert("エラー", "ログインが必要です");
        return;
      }
      const response = await DataProvider.passUser(currentUserId, userId);

      if (response.error) {
        Alert.alert("エラー", response.error);
        return;
      }

      console.log("✅ Pass successful:", response.data);
      // Remove the passed user from the list
      setProfiles((prevProfiles) =>
        prevProfiles.filter((profile) => profile.id !== userId),
      );
    } catch (error) {
      console.error("❌ Error passing user:", error);
      Alert.alert("エラー", "パスの送信に失敗しました");
    }
  };

  

  const handleViewProfile = (userId: string) => {
    console.log("View profile:", userId);
    navigation.navigate("Profile", { userId });
  };

  const loadRecommendedUsers = async () => {
    try {
      setLoading(true);

      // Get the current profileId (UUID) from authentication
      const currentUserId = profileId;
      if (!currentUserId) {
        console.error("❌ No current profileId available in loadRecommendedUsers");
        console.log("⚠️ User is not logged in or profile not loaded yet");
        setProfiles([]);
        setLoading(false);
        return;
      }

      console.log("📥 Loading recommended users for profileId:", currentUserId);
      const response = await DataProvider.getRecommendedUsers(
        currentUserId,
        20,
      );

      if (response.error) {
        console.error("❌ Failed to load recommended users:", response.error);
        Alert.alert("エラー", `ユーザーの読み込みに失敗しました: ${response.error}`);
        setProfiles([]);
      } else {
        let users = response.data || [];
        console.log("✅ Loaded recommended users:", users.length);
        console.log("👥 Users:", users.map(u => ({ id: u.id, name: u.name })));

        if (users.length === 0) {
          console.warn("⚠️ No recommended users; loading recent registrations as fallback");
          const allResp = await DataProvider.getUsers({});
          if (!allResp.error && allResp.data) {
            users = allResp.data.filter((u) => u.id !== currentUserId).slice(0, 20);
            console.log("✅ Fallback users loaded:", users.length);
          }
        }
        
        // Apply interaction state to show which users are already liked/passed
        const usersWithState = userInteractionService.applyInteractionState(users);
        console.log("✅ Applied interaction state to users");
        setProfiles(usersWithState);
      }
    } catch (error) {
      console.error("💥 Error loading recommended users:", error);
      Alert.alert("エラー", "ユーザーの読み込み中にエラーが発生しました");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await DataProvider.getUsers(filters);

      if (response.error) {
        console.error("Failed to load profiles:", response.error);
        setProfiles([]);
      } else {
        setProfiles(response.data || []);
      }
    } catch (_error) {
      console.error("Error loading profiles:", _error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
    await loadProfiles();
  };

  const renderProfileCard = ({ item }: { item: User }) => (
    <ProfileCard
      profile={item}
      onLike={handleLike}
      onPass={handlePass}
      onViewProfile={handleViewProfile}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "recommended" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("recommended")}
            accessibilityRole="tab"
            accessibilityLabel="おすすめのプロフィールを表示"
            accessibilityState={{ selected: activeTab === "recommended" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "recommended" && styles.activeTabText,
              ]}
            >
              おすすめ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "registration" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("registration")}
            accessibilityRole="tab"
            accessibilityLabel="登録順のプロフィールを表示"
            accessibilityState={{ selected: activeTab === "registration" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "registration" && styles.activeTabText,
              ]}
            >
              登録順
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="フィルターを開く"
          accessibilityHint="プロフィール検索のフィルターを設定します"
        >
          <Ionicons name="options-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Profile Grid */}
      {loading ? (
        <Loading text="プロフィールを読み込み中..." fullScreen />
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.profileGrid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="プロフィールが見つかりません"
              subtitle="フィルターを調整して、もう一度お試しください"
              buttonTitle="フィルターをリセット"
              onButtonPress={() => setFilters({})}
            />
          }
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            // Simulate refresh
            setTimeout(() => setLoading(false), 1000);
          }}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray[600],
  },
  activeTabText: {
    color: Colors.white,
  },
  filterButton: {
    padding: Spacing.sm,
  },
  profileGrid: {
    padding: Spacing.sm,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
});

export default SearchScreen;
