/**
 * RecruitmentListScreen
 *
 * Main screen for the Recruitment (募集) tab.
 * Features:
 * - List of open recruitments
 * - Tabs: すべて | 参加可能 | 自分の募集
 * - Filter by prefecture, course type
 * - Pull-to-refresh, infinite scroll
 * - Create recruitment button
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { RootStackParamList, Recruitment, RecruitmentFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useRecruitments, usePendingApplicationCount } from '../hooks/queries/useRecruitments';
import RecruitmentCard from '../components/RecruitmentCard';
import RecruitmentFiltersModal from '../components/RecruitmentFiltersModal';
import EmptyState from '../components/EmptyState';

type NavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'all' | 'available' | 'mine';

const RecruitmentListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { profileId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RecruitmentFilters>({});

  // Build filters based on active tab
  const getTabFilters = useCallback((): RecruitmentFilters => {
    const baseFilters: RecruitmentFilters = { ...filters };

    switch (activeTab) {
      case 'available':
        return { ...baseFilters, has_slots: true, exclude_own: true };
      case 'mine':
        // For "mine" tab, we'll use a different query
        return baseFilters;
      default:
        return { ...baseFilters, exclude_own: false };
    }
  }, [activeTab, filters]);

  // Fetch recruitments (exclude "mine" tab which uses a different query)
  const {
    recruitments,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useRecruitments({
    filters: getTabFilters(),
    currentUserId: profileId || undefined,
    enabled: activeTab !== 'mine',
  });

  // Get pending application count for badge
  const { data: pendingCount = 0 } = usePendingApplicationCount(
    profileId || '',
    !!profileId
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle recruitment press
  const handleRecruitmentPress = useCallback(
    (recruitmentId: string) => {
      navigation.navigate('RecruitmentDetail', { recruitmentId });
    },
    [navigation]
  );

  // Handle create press
  const handleCreatePress = useCallback(() => {
    navigation.navigate('RecruitmentCreate');
  }, [navigation]);

  // Handle my recruitments press
  const handleMyRecruitmentsPress = useCallback(() => {
    navigation.navigate('MyRecruitments');
  }, [navigation]);

  // Handle filter apply
  const handleFilterApply = useCallback((newFilters: RecruitmentFilters) => {
    setFilters(newFilters);
  }, []);

  // Check if filters are active
  const hasActiveFilters =
    filters.prefecture || filters.course_type || filters.has_slots;

  // Render recruitment item
  const renderItem = useCallback(
    ({ item }: { item: Recruitment }) => (
      <RecruitmentCard
        recruitment={item}
        onPress={() => handleRecruitmentPress(item.id)}
      />
    ),
    [handleRecruitmentPress]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <EmptyState
        icon="golf-outline"
        title="募集がありません"
        subtitle={
          hasActiveFilters
            ? '条件を変更して再検索してください'
            : '新しい募集が投稿されるとここに表示されます'
        }
      />
    );
  }, [isLoading, hasActiveFilters]);

  // Render footer
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with sliding tabs and actions */}
      <View style={styles.header}>
        {/* Sliding tabs (same style as さがす page) */}
        <View style={styles.tabContainer}>
          {(['all', 'available'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              >
                {tab === 'all' ? 'すべて' : '参加可能'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions on the right */}
        <View style={styles.headerActions}>
          {/* Filter button */}
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? Colors.primary : Colors.gray[500]}
            />
            {hasActiveFilters && (
              <View style={styles.filterDot} />
            )}
          </TouchableOpacity>

          {/* My Recruitments button with badge */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMyRecruitmentsPress}
          >
            <Ionicons name="folder-outline" size={22} color={Colors.gray[700]} />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Create button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreatePress}
          >
            <Image
              source={require('../../assets/images/Icons/Add-Outline.png')}
              style={styles.addIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlashList
          data={recruitments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={180}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Filter Modal */}
      <RecruitmentFiltersModal
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={handleFilterApply}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  // Sliding tab container (same style as さがす page)
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.gray[500],
  },
  tabTextActive: {
    color: Colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  actionButton: {
    padding: Spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  addIcon: {
    width: 22,
    height: 22,
    tintColor: Colors.primary,
  },
  filterDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default RecruitmentListScreen;
