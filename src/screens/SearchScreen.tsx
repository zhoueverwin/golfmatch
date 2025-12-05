import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
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

const { width: screenWidth } = Dimensions.get("window");

// Fixed grid constants
const HORIZONTAL_PADDING = Spacing.md * 2; // 16 * 2 = 32
const INTER_ITEM_SPACING = Spacing.xs; // 4
const COLUMNS = 2;
// Calculate exact card width: (ScreenWidth - Padding - Gap) / 2
const CARD_WIDTH = (screenWidth - HORIZONTAL_PADDING - INTER_ITEM_SPACING) / COLUMNS;
// Fixed aspect ratio 1:1.3 for cards
const CARD_HEIGHT = CARD_WIDTH * 1.3;
// Add bottom margin to height
const ITEM_HEIGHT = CARD_HEIGHT + Spacing.xs; // Card Height + MarginBottom

const FILTER_STORAGE_KEY = "search_filters";

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { user, profileId } = useAuth(); // Get profileId from AuthContext
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommended" | "registration">(
    "recommended",
  );
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [viewerGender, setViewerGender] = useState<User["gender"] | "unknown">(
    "unknown",
  );

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // Load users when profileId becomes available or filters change
  useEffect(() => {
    if (profileId) {
      // Load user interactions first
      userInteractionService.loadUserInteractions(profileId);
      setPage(1); // Reset page
      setHasMore(true); // Reset hasMore
      loadUsers(1); // Load first page
    }
  }, [profileId, activeTab, filters]); // Re-run when profileId, tab, or filters change

  useEffect(() => {
    if (profileId) {
      loadViewerGender(profileId);
    }
  }, [profileId]);

  // Update hasActiveFilters when filters change
  useEffect(() => {
    const filterValues = Object.values(filters).filter((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== null;
    });
    setHasActiveFilters(filterValues.length > 0);
  }, [filters]);


  

  const handleViewProfile = useCallback((userId: string) => {
    console.log("View profile:", userId);
    navigation.navigate("Profile", { userId });
  }, [navigation]);

  const loadViewerGender = async (profileId: string) => {
    try {
      const response = await DataProvider.getUser(profileId);
      if (response.success && response.data) {
        setViewerGender(response.data.gender || "unknown");
      }
    } catch (error) {
      console.error("Error loading viewer gender:", error);
      setViewerGender("unknown");
    }
  };

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (savedFilters && savedFilters.trim() !== '') {
        try {
          const parsedFilters = JSON.parse(savedFilters);
          setFilters(parsedFilters);
        } catch (parseError) {
          console.error("Error parsing saved filters (corrupted data):", parseError);
          // Remove corrupted data
          await AsyncStorage.removeItem(FILTER_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const saveFilters = async (newFilters: SearchFilters) => {
    try {
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters));
    } catch (error) {
      console.error("Error saving filters:", error);
    }
  };

  const loadUsers = async (pageNumber = 1) => {
    try {
      const isFirstPage = pageNumber === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }

      const currentUserId = profileId;
      if (!currentUserId) {
        console.error("❌ No current profileId available");
        setProfiles([]);
        setLoading(false);
        setIsFetchingNextPage(false);
        return;
      }

      let users: User[] = [];

      if (activeTab === "recommended" && !hasActiveFilters) {
        // Load intelligent recommendations using multi-factor scoring algorithm
        // Factors: calendar overlap, skill similarity, location, activity, profile quality
        const response = await DataProvider.getIntelligentRecommendations(currentUserId, 20);

        if (response.error) {
          console.error("❌ Failed to load intelligent recommendations:", response.error);
          console.log("⚠️ Falling back to simple recommendations");
          // Fallback to simple recommendations if intelligent algorithm not available
          const fallbackResp = await DataProvider.getRecommendedUsers(currentUserId, 20);
          if (!fallbackResp.error && fallbackResp.data) {
            users = fallbackResp.data;
          }
        } else {
          users = response.data || [];
          if (users.length === 0 && isFirstPage) {
            console.log("⚠️ No intelligent recommendations found, trying simple recommendations");
            // Fallback to simple recommendations if intelligent returns empty
            const fallbackResp = await DataProvider.getRecommendedUsers(currentUserId, 20);
            if (!fallbackResp.error && fallbackResp.data) {
              users = fallbackResp.data;
            } else {
              // Last fallback: all users
              const allResp = await DataProvider.searchUsers({}, pageNumber, 20, "recommended");
              if (!allResp.error && allResp.data) {
                users = allResp.data.filter((u) => u.id !== currentUserId);
              }
            }
          }
        }
      } else {
        // Load filtered users for both tabs when filters are active
        // or registration tab (always sort by registration even without filters)
        const response = await DataProvider.searchUsers(
          filters,
          pageNumber,
          20,
          activeTab === "registration" ? "registration" : "recommended"
        );

        if (response.error) {
          console.error("❌ Failed to load filtered users:", response.error);
          Alert.alert("エラー", `ユーザーの読み込みに失敗しました: ${response.error}`);
        } else {
          users = (response.data || []).filter((u) => u.id !== currentUserId);
        }
      }

      // Apply interaction state
      const usersWithState = userInteractionService.applyInteractionState(users);

      console.log(`📊 Setting ${usersWithState.length} profiles to state`);
      console.log(`📋 First 3 profiles:`, usersWithState.slice(0, 3).map(u => ({ name: u.name, gender: u.gender, score: u.recommendation_score })));

      if (usersWithState.length < 20) {
        setHasMore(false);
      }

      if (isFirstPage) {
        setProfiles(usersWithState);
        console.log(`✅ Profiles state updated with ${usersWithState.length} users`);
      } else {
        // Filter out duplicates just in case
        setProfiles(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const newUsers = usersWithState.filter(u => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      }
      
    } catch (error) {
      console.error("💥 Error loading users:", error);
      Alert.alert("エラー", "ユーザーの読み込み中にエラーが発生しました");
      if (pageNumber === 1) setProfiles([]);
    } finally {
      setLoading(false);
      setIsFetchingNextPage(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !isFetchingNextPage && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadUsers(nextPage);
    }
  };

  const handleApplyFilters = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    await saveFilters(newFilters);
    setFilterModalVisible(false);
    // loadUsers will be called automatically by useEffect when filters change
  };

  const overrideItemLayout = useCallback((layout: { span?: number; size?: number }) => {
    layout.size = ITEM_HEIGHT;
    layout.span = 1;
  }, []);

  const renderProfileCard = useCallback(({ item, index }: ListRenderItemInfo<User>) => {
    console.log(`🎴 Rendering card ${index}: ${item.name} (gender: ${item.gender})`);
    return (
      <ProfileCard
        profile={item}
        onViewProfile={handleViewProfile}
        testID={`SEARCH_SCREEN.CARD.${index}.${item.gender || "unknown"}`}
      />
    );
  }, [handleViewProfile]);

  return (
    <SafeAreaView
      style={styles.container}
      testID={`SEARCH_SCREEN.ROOT.${viewerGender || "unknown"}`}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "recommended" && styles.activeTab]}
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
            style={[styles.tab, activeTab === "registration" && styles.activeTab]}
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
            <Ionicons name="options-outline" size={20} color={Colors.gray[500]} />
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
        <FlashList
          data={profiles}
          renderItem={renderProfileCard}
          keyExtractor={(item: User) => item.id}
          numColumns={2}
          estimatedItemSize={ITEM_HEIGHT}
          overrideItemLayout={overrideItemLayout}
          contentContainerStyle={styles.profileGrid}
          showsVerticalScrollIndicator={false}
          testID={`SEARCH_SCREEN.RESULT_LIST.${viewerGender || "unknown"}`}
          // FlashList performance props
          drawDistance={screenWidth * 2}
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
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
    marginRight: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
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
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
  },
  profileGrid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  row: {
    justifyContent: "flex-start",
    marginBottom: Spacing.xs,
  },
});

export default SearchScreen;
