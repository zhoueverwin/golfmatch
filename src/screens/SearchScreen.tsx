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
import AsyncStorage from "@react-native-async-storage/async-storage";

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const FILTER_STORAGE_KEY = "search_filters";

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
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // Load users when profileId becomes available or filters change
  useEffect(() => {
    if (profileId) {
      console.log("📱 SearchScreen: profileId loaded, fetching users...", profileId);
      // Load user interactions first
      userInteractionService.loadUserInteractions(profileId);
      loadUsers();
    } else {
      console.log("⏳ SearchScreen: Waiting for profileId to load...");
    }
  }, [profileId, activeTab, filters]); // Re-run when profileId, tab, or filters change

  // Update hasActiveFilters when filters change
  useEffect(() => {
    const filterValues = Object.values(filters).filter((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== null;
    });
    setHasActiveFilters(filterValues.length > 0);
  }, [filters]);


  

  const handleViewProfile = (userId: string) => {
    console.log("View profile:", userId);
    navigation.navigate("Profile", { userId });
  };

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        console.log("📥 Loaded saved filters:", parsedFilters);
        setFilters(parsedFilters);
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const saveFilters = async (newFilters: SearchFilters) => {
    try {
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters));
      console.log("💾 Saved filters to storage");
    } catch (error) {
      console.error("Error saving filters:", error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const currentUserId = profileId;
      if (!currentUserId) {
        console.error("❌ No current profileId available");
        setProfiles([]);
        setLoading(false);
        return;
      }

      let users: User[] = [];

      if (activeTab === "recommended" && !hasActiveFilters) {
        // Load recommended users only when no filters are active
        console.log("📥 Loading recommended users...");
        const response = await DataProvider.getRecommendedUsers(currentUserId, 20);

        if (response.error) {
          console.error("❌ Failed to load recommended users:", response.error);
          Alert.alert("エラー", `ユーザーの読み込みに失敗しました: ${response.error}`);
        } else {
          users = response.data || [];
          if (users.length === 0) {
            console.warn("⚠️ No recommended users; loading all users as fallback");
            const allResp = await DataProvider.getUsers({});
            if (!allResp.error && allResp.data) {
              users = allResp.data.filter((u) => u.id !== currentUserId).slice(0, 20);
            }
          }
        }
      } else {
        // Load filtered users for both tabs when filters are active
        // or registration tab
        console.log("📥 Loading users with filters:", filters);
        const response = await DataProvider.getUsers(filters);

        if (response.error) {
          console.error("❌ Failed to load filtered users:", response.error);
          Alert.alert("エラー", `ユーザーの読み込みに失敗しました: ${response.error}`);
        } else {
          users = (response.data || []).filter((u) => u.id !== currentUserId);
        }
      }

      // Apply interaction state
      const usersWithState = userInteractionService.applyInteractionState(users);
      console.log("✅ Loaded users:", usersWithState.length);
      setProfiles(usersWithState);
    } catch (error) {
      console.error("💥 Error loading users:", error);
      Alert.alert("エラー", "ユーザーの読み込み中にエラーが発生しました");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    await saveFilters(newFilters);
    setFilterModalVisible(false);
    // loadUsers will be called automatically by useEffect when filters change
  };

  const renderProfileCard = ({ item }: { item: User }) => (
    <ProfileCard
      profile={item}
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
          <View>
            <Ionicons name="options-outline" size={24} color={Colors.gray[600]} />
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {Object.values(filters).filter((v) => {
                    if (Array.isArray(v)) return v.length > 0;
                    return v !== undefined && v !== null;
                  }).length}
                </Text>
              </View>
            )}
          </View>
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
              onButtonPress={async () => {
                setFilters({});
                await saveFilters({});
              }}
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
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
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
