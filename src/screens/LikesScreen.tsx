import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius, Dimensions as AppDimensions, Shadows } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { User } from '../types/dataModels';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

const LikesScreen: React.FC = () => {
  const [likesCount, setLikesCount] = useState(0);
  const [profileCompletion] = useState(62);
  const [receivedLikes, setReceivedLikes] = useState<User[]>([]);

  // Mock data for development
  useEffect(() => {
    setLikesCount(89);
    
    // Mock received likes data
    const mockReceivedLikes: User[] = [
      {
        id: '1',
        user_id: '1',
        name: 'Mii',
        age: 25,
        gender: 'female',
        location: '群馬県',
        prefecture: '群馬県',
        golf_skill_level: 'beginner',
        profile_pictures: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'],
        is_verified: false,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        user_id: '2',
        name: 'Yuki',
        age: 28,
        gender: 'female',
        location: '千葉県',
        prefecture: '千葉県',
        golf_skill_level: 'intermediate',
        profile_pictures: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'],
        is_verified: true,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        user_id: '3',
        name: 'Sakura',
        age: 23,
        gender: 'female',
        location: '東京都',
        prefecture: '東京都',
        golf_skill_level: 'beginner',
        profile_pictures: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'],
        is_verified: false,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        user_id: '4',
        name: 'Aoi',
        age: 26,
        gender: 'female',
        location: '神奈川県',
        prefecture: '神奈川県',
        golf_skill_level: 'advanced',
        profile_pictures: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'],
        is_verified: true,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '5',
        user_id: '5',
        name: 'Hana',
        age: 24,
        gender: 'female',
        location: '埼玉県',
        prefecture: '埼玉県',
        golf_skill_level: 'intermediate',
        profile_pictures: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face'],
        is_verified: false,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setReceivedLikes(mockReceivedLikes);
  }, []);

  const getAgeRange = (age: number): string => {
    if (age < 25) return '20代前半';
    if (age < 30) return '20代後半';
    if (age < 35) return '30代前半';
    if (age < 40) return '30代後半';
    if (age < 45) return '40代前半';
    if (age < 50) return '40代後半';
    return '50代以上';
  };

  const getSkillLevelText = (level: string): string => {
    switch (level) {
      case 'beginner':
        return 'ビギナー';
      case 'intermediate':
        return '中級者';
      case 'advanced':
        return '上級者';
      case 'professional':
        return 'プロ';
      default:
        return '未設定';
    }
  };

  const handleLikeBack = (userId: string) => {
    console.log('Like back user:', userId);
    // TODO: Implement like back functionality
  };

  const handlePass = (userId: string) => {
    console.log('Pass user:', userId);
    // TODO: Implement pass functionality
  };

  // const handleViewProfile = (userId: string) => {
  //   console.log('View profile:', userId);
  //   // TODO: Navigate to profile screen
  // };

  const renderLikeItem = ({ item }: { item: User }) => (
    <Card style={styles.likeItem} shadow="small">
      <Image
        source={{ uri: item.profile_pictures[0] }}
        style={styles.profileImage}
        accessibilityLabel={`${item.name}のプロフィール写真`}
      />
      <View style={styles.profileInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.profileName}>{item.name}</Text>
          {item.is_verified && (
            <View style={styles.verificationBadge}>
              <Ionicons name="checkmark" size={12} color={Colors.white} />
            </View>
          )}
        </View>
        <Text style={styles.ageLocation}>
          {getAgeRange(item.age)}・{item.prefecture}
        </Text>
        <Text style={styles.skillLevel}>
          {getSkillLevelText(item.golf_skill_level)}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handlePass(item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}をパス`}
          accessibilityHint="このユーザーをパスします"
        >
          <Ionicons name="close" size={AppDimensions.iconSize} color={Colors.gray[600]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleLikeBack(item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}にいいね返し`}
          accessibilityHint="このユーザーにいいねを返します"
        >
          <Ionicons name="heart" size={AppDimensions.iconSize} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>いいね</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{likesCount}</Text>
          <Text style={styles.statLabel}>もらったいいね</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profileCompletion}%</Text>
          <Text style={styles.statLabel}>プロフィール充実度</Text>
        </View>
      </View>

      {/* Profile Completion Banner */}
      <TouchableOpacity style={styles.completionBanner}>
        <Text style={styles.completionBannerText}>
          プロフィールを充実させてマッチング率アップ!
        </Text>
      </TouchableOpacity>

      {/* Received Likes List */}
      <FlatList
        data={receivedLikes}
        renderItem={renderLikeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.likesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="いいねがありません"
            subtitle="プロフィールを充実させて、いいねをもらいましょう"
            buttonTitle="プロフィールを編集"
            onButtonPress={() => console.log('Edit profile')}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  filterButton: {
    padding: Spacing.sm,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  completionBanner: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  completionBannerText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  likesList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  likeItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageLocation: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  skillLevel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: AppDimensions.touchTarget,
    height: AppDimensions.touchTarget,
    borderRadius: AppDimensions.touchTarget / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  passButton: {
    backgroundColor: Colors.gray[100],
  },
  likeButton: {
    backgroundColor: Colors.primary + '20',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default LikesScreen;
