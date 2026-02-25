import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { User, SearchFilters } from "../types/dataModels";
import { RootStackParamList } from "../types";
import CarouselSection from "./CarouselSection";
import { DataProvider } from "../services";
import { useAuth } from "../contexts/AuthContext";
import { userInteractionService } from "../services/userInteractionService";
import { CacheService } from "../services/cacheService";
import { setSwipeCardData } from "../services/swipeCardData";
import EmptyState from "./EmptyState";
import Loading from "./Loading";

// For filtered mode, reuse the grid display
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import ProfileCard from "./ProfileCard";

const { width: screenWidth } = require("react-native").Dimensions.get("window");
const HORIZONTAL_PADDING = Spacing.md * 2;
const INTER_ITEM_SPACING = Spacing.xs;
const COLUMNS = 2;
const CARD_WIDTH =
  (screenWidth - HORIZONTAL_PADDING - INTER_ITEM_SPACING) / COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.3;
const ITEM_HEIGHT = CARD_HEIGHT + Spacing.xs;

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface RecommendedCarouselViewProps {
  hasActiveFilters: boolean;
  filters: SearchFilters;
  onViewProfile: (userId: string) => void;
  onResetFilters: () => void;
}

const RecommendedCarouselView: React.FC<RecommendedCarouselViewProps> = ({
  hasActiveFilters,
  filters,
  onViewProfile,
  onResetFilters,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { profileId } = useAuth();

  // Carousel sections state
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [newUsers, setNewUsers] = useState<User[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtered grid state
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredLoading, setFilteredLoading] = useState(true);
  const [filteredPage, setFilteredPage] = useState(1);
  const [filteredHasMore, setFilteredHasMore] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Track viewer's prefecture for "nearby" section
  const [viewerPrefecture, setViewerPrefecture] = useState<string | null>(null);

  // Load viewer info
  useEffect(() => {
    if (profileId) {
      DataProvider.getUser(profileId).then((resp) => {
        if (resp.success && resp.data) {
          setViewerPrefecture(resp.data.prefecture || null);
        }
      });
    }
  }, [profileId]);

  const loadCarouselSections = useCallback(async () => {
    if (!profileId) return;
    setSectionsLoading(true);
    try {
      await userInteractionService.loadUserInteractions(profileId);
      const interactionState = userInteractionService.getState();
      const excludeIds = [
        profileId,
        ...Array.from(interactionState.likedUsers),
        ...Array.from(interactionState.passedUsers),
      ];

      const filterInteracted = (users: User[]) =>
        users.filter((u) => !excludeIds.includes(u.id));

      // Load all sections in parallel
      const [recsResp, newResp, nearbyResp] = await Promise.all([
        // Section 1: Intelligent recommendations
        DataProvider.getIntelligentRecommendations(profileId, 20).then(
          async (resp) => {
            if (resp.data && resp.data.length > 0) return resp;
            // Fallback chain
            const fallback = await DataProvider.getRecommendedUsers(
              profileId,
              20,
            );
            if (fallback.data && fallback.data.length > 0) return fallback;
            return DataProvider.searchUsers(
              {},
              1,
              20,
              "recommended",
              excludeIds,
            );
          },
        ),
        // Section 2: New registrations
        DataProvider.searchUsers({}, 1, 20, "registration"),
        // Section 3: Nearby users
        viewerPrefecture
          ? DataProvider.searchUsers(
              { prefecture: viewerPrefecture },
              1,
              20,
              "recommended",
            )
          : Promise.resolve({ data: [] as User[], error: null }),
      ]);

      setRecommendedUsers(filterInteracted(recsResp.data || []));
      setNewUsers(
        filterInteracted(
          (newResp.data || []).filter((u: User) => u.id !== profileId),
        ),
      );
      setNearbyUsers(
        filterInteracted(
          (nearbyResp.data || []).filter((u: User) => u.id !== profileId),
        ),
      );
    } catch (error) {
      console.error("RecommendedCarouselView: Error loading sections:", error);
    } finally {
      setSectionsLoading(false);
    }
  }, [profileId, viewerPrefecture]);

  const loadFilteredUsers = useCallback(
    async (pageNumber = 1) => {
      if (!profileId) return;
      const isFirstPage = pageNumber === 1;
      if (isFirstPage) {
        setFilteredLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }

      try {
        await userInteractionService.loadUserInteractions(profileId);
        const interactionState = userInteractionService.getState();
        const excludeIds = [
          profileId,
          ...Array.from(interactionState.likedUsers),
          ...Array.from(interactionState.passedUsers),
        ];

        const response = await DataProvider.searchUsers(
          filters,
          pageNumber,
          20,
          "recommended",
        );

        if (response.error) {
          Alert.alert("エラー", "ユーザーの読み込みに失敗しました");
        } else {
          let users = (response.data || []).filter(
            (u) => !excludeIds.includes(u.id),
          );
          users = userInteractionService.applyInteractionState(users);

          const responseHasMore =
            response.pagination?.hasMore ?? (response.data?.length === 20);
          setFilteredHasMore(responseHasMore);

          if (isFirstPage) {
            setFilteredUsers(users);
          } else {
            setFilteredUsers((prev) => {
              const existingIds = new Set(prev.map((u) => u.id));
              const newItems = users.filter((u) => !existingIds.has(u.id));
              return [...prev, ...newItems];
            });
          }
        }
      } catch (error) {
        console.error("Error loading filtered users:", error);
        if (pageNumber === 1) setFilteredUsers([]);
      } finally {
        setFilteredLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [profileId, filters],
  );

  // Load data based on filter state
  useEffect(() => {
    if (!profileId) return;
    if (hasActiveFilters) {
      setFilteredPage(1);
      setFilteredHasMore(true);
      loadFilteredUsers(1);
    } else {
      loadCarouselSections();
    }
  }, [profileId, hasActiveFilters, filters, loadCarouselSections, loadFilteredUsers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (profileId) {
        await CacheService.remove(
          `intelligent_recommendations_v2:${profileId}:20`,
        );
      }
      if (hasActiveFilters) {
        setFilteredPage(1);
        setFilteredHasMore(true);
        await loadFilteredUsers(1);
      } else {
        await loadCarouselSections();
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    profileId,
    hasActiveFilters,
    loadFilteredUsers,
    loadCarouselSections,
  ]);

  const handleCardPress = useCallback(
    (sectionUsers: User[], tappedIndex: number) => {
      setSwipeCardData(sectionUsers, tappedIndex);
      navigation.navigate("SwipeCard");
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (!filteredLoading && !isFetchingNextPage && filteredHasMore) {
      const nextPage = filteredPage + 1;
      setFilteredPage(nextPage);
      loadFilteredUsers(nextPage);
    }
  }, [filteredLoading, isFetchingNextPage, filteredHasMore, filteredPage, loadFilteredUsers]);

  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }) => {
      layout.size = ITEM_HEIGHT;
      layout.span = 1;
    },
    [],
  );

  const renderProfileCard = useCallback(
    ({ item, index }: ListRenderItemInfo<User>) => (
      <ProfileCard
        profile={item}
        onViewProfile={onViewProfile}
        testID={`SEARCH_SCREEN.CARD.${index}.${item.gender || "unknown"}`}
      />
    ),
    [onViewProfile],
  );

  // Filtered mode: show FlashList grid
  if (hasActiveFilters) {
    if (filteredLoading && filteredUsers.length === 0) {
      return <Loading text="プロフィールを読み込み中..." fullScreen />;
    }

    return (
      <FlashList
        data={filteredUsers}
        renderItem={renderProfileCard}
        keyExtractor={(item: User) => item.id}
        numColumns={2}
        overrideItemLayout={overrideItemLayout}
        contentContainerStyle={gridStyles.profileGrid}
        showsVerticalScrollIndicator={false}
        drawDistance={screenWidth * 2}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="プロフィールが見つかりません"
            subtitle="フィルターを調整して、もう一度お試しください"
            buttonTitle="フィルターをリセット"
            onButtonPress={onResetFilters}
          />
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    );
  }

  // Carousel mode
  if (sectionsLoading && recommendedUsers.length === 0) {
    return <Loading text="おすすめを読み込み中..." fullScreen />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <CarouselSection
        title="あなたにおすすめ"
        users={recommendedUsers}
        loading={sectionsLoading}
        onCardPress={(user, index) => handleCardPress(recommendedUsers, index)}
      />
      <CarouselSection
        title="新しく登録したお相手"
        users={newUsers}
        loading={sectionsLoading}
        onCardPress={(user, index) => handleCardPress(newUsers, index)}
      />
      {nearbyUsers.length > 0 && (
        <CarouselSection
          title="あなたの近くの人"
          users={nearbyUsers}
          loading={sectionsLoading}
          onCardPress={(user, index) => handleCardPress(nearbyUsers, index)}
        />
      )}

      {/* Empty state if all sections are empty */}
      {!sectionsLoading &&
        recommendedUsers.length === 0 &&
        newUsers.length === 0 &&
        nearbyUsers.length === 0 && (
          <EmptyState
            icon="search-outline"
            title="おすすめのユーザーが見つかりません"
            subtitle="しばらくしてからもう一度お試しください"
          />
        )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
});

const gridStyles = StyleSheet.create({
  profileGrid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
});

export default RecommendedCarouselView;
