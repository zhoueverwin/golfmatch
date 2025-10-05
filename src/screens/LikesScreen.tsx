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
import Toast from '../components/Toast';
import ProfileCard from '../components/ProfileCard';
import DataProvider from '../services/dataProvider';
import { debugDataProvider } from '../utils/debugDataProvider';

const LikesScreen: React.FC = () => {
  const [likesCount, setLikesCount] = useState(0);
  const [profileCompletion] = useState(62);
  const [receivedLikes, setReceivedLikes] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Load received likes data
  const loadReceivedLikes = async () => {
    try {
      setLoading(true);
      
      // For testing, let's get some users from the DataProvider directly
      console.log('🔍 Loading test users from DataProvider...');
      const usersResponse = await DataProvider.getUsers();
      
      if (usersResponse.error) {
        console.error('Failed to load users:', usersResponse.error);
        setReceivedLikes([]);
        setLikesCount(0);
      } else {
        // Get users that are not the current user
        const otherUsers = (usersResponse.data || []).filter(user => user.id !== 'current_user');
        console.log('👥 Found other users:', otherUsers.map(u => ({ id: u.id, name: u.name })));
        
        // Take first 3 users for testing and initialize interaction state
        const testUsers = otherUsers.slice(0, 3).map(user => ({
          ...user,
          isLiked: false,
          isSuperLiked: false,
          isPassed: false,
          interactionType: undefined,
        }));
        
        console.log('✅ Set test users with interaction state:', testUsers.map(u => ({ 
          id: u.id, 
          name: u.name, 
          isLiked: u.isLiked, 
          isSuperLiked: u.isSuperLiked 
        })));
        
        setReceivedLikes(testUsers);
        setLikesCount(testUsers.length);
      }
    } catch (error) {
      console.error('Error loading received likes:', error);
      setReceivedLikes([]);
      setLikesCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debug DataProvider first
    debugDataProvider();
    loadReceivedLikes();
  }, []);

  // Helper function to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    console.log('🍞 showToast called:', { message, type });
    setToast({
      visible: true,
      message,
      type,
    });
    console.log('🍞 Toast state updated');
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

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

  const handleLikeBack = async (userId: string) => {
    console.log('🔥 handleLikeBack called with userId:', userId);
    try {
      console.log('📞 Calling DataProvider.likeUser...');
      const response = await DataProvider.likeUser('current_user', userId);
      console.log('📥 DataProvider response:', response);
      
      if (response.error) {
        console.error('❌ Failed to like user:', response.error);
        showToast('いいねの送信に失敗しました', 'error');
      } else {
        console.log('✅ Like successful, updating UI...');
        // Find user name for toast message
        const user = receivedLikes.find(u => u.id === userId);
        const userName = user?.name || 'ユーザー';
        console.log('👤 User name for toast:', userName);
        
        // Update local state to reflect the like
        setReceivedLikes(prev => {
          const updated = prev.map(user => {
            if (user.id === userId) {
              const newUser = { ...user, isLiked: true, interactionType: 'like' as const };
              console.log('🔄 Updated user:', newUser.id, 'isLiked:', newUser.isLiked);
              return newUser;
            }
            return user;
          });
          console.log('🔄 Updated receivedLikes array length:', updated.length);
          return updated;
        });
        
        console.log('🍞 Showing toast message...');
        showToast(`${userName}にいいねを送りました！`, 'success');
        console.log('✅ Successfully liked user:', userId);
      }
    } catch (error) {
      console.error('💥 Error liking user:', error);
      showToast('いいねの送信に失敗しました', 'error');
    }
  };

  const handlePass = async (userId: string) => {
    console.log('🔥 handlePass called with userId:', userId);
    try {
      console.log('📞 Calling DataProvider.passUser...');
      const response = await DataProvider.passUser('current_user', userId);
      console.log('📥 DataProvider response:', response);
      
      if (response.error) {
        console.error('❌ Failed to pass user:', response.error);
        showToast('パスの送信に失敗しました', 'error');
      } else {
        console.log('✅ Pass successful, updating UI...');
        // Find user name for toast message
        const user = receivedLikes.find(u => u.id === userId);
        const userName = user?.name || 'ユーザー';
        console.log('👤 User name for toast:', userName);
        
        // Remove user from the list since they were passed
        setReceivedLikes(prev => {
          const filtered = prev.filter(user => user.id !== userId);
          console.log('🔄 Updated receivedLikes (filtered):', filtered);
          return filtered;
        });
        setLikesCount(prev => {
          const newCount = Math.max(0, prev - 1);
          console.log('📊 Updated likes count:', newCount);
          return newCount;
        });
        
        console.log('🍞 Showing toast message...');
        showToast(`${userName}をパスしました`, 'info');
        console.log('✅ Successfully passed user:', userId);
      }
    } catch (error) {
      console.error('💥 Error passing user:', error);
      showToast('パスの送信に失敗しました', 'error');
    }
  };

  const handleSuperLike = async (userId: string) => {
    console.log('🔥 handleSuperLike called with userId:', userId);
    try {
      console.log('📞 Calling DataProvider.superLikeUser...');
      const response = await DataProvider.superLikeUser('current_user', userId);
      console.log('📥 DataProvider response:', response);
      
      if (response.error) {
        console.error('❌ Failed to super like user:', response.error);
        showToast('スーパーいいねの送信に失敗しました', 'error');
      } else {
        console.log('✅ Super like successful, updating UI...');
        // Find user name for toast message
        const user = receivedLikes.find(u => u.id === userId);
        const userName = user?.name || 'ユーザー';
        console.log('👤 User name for toast:', userName);
        
        // Update local state to reflect the super like
        setReceivedLikes(prev => {
          const updated = prev.map(user => {
            if (user.id === userId) {
              const newUser = { ...user, isSuperLiked: true, interactionType: 'super_like' as const };
              console.log('🔄 Updated user:', newUser.id, 'isSuperLiked:', newUser.isSuperLiked);
              return newUser;
            }
            return user;
          });
          console.log('🔄 Updated receivedLikes array length:', updated.length);
          return updated;
        });
        
        console.log('🍞 Showing toast message...');
        showToast(`${userName}にスーパーいいねを送りました！✨`, 'success');
        console.log('✅ Successfully super liked user:', userId);
      }
    } catch (error) {
      console.error('💥 Error super liking user:', error);
      showToast('スーパーいいねの送信に失敗しました', 'error');
    }
  };

  const handleViewProfile = (userId: string) => {
    console.log('🔥 handleViewProfile called with userId:', userId);
    // TODO: Navigate to profile screen
    showToast('プロフィール画面に移動します', 'info');
  };

  const renderLikeItem = ({ item }: { item: User }) => {
    console.log('🎨 Rendering ProfileCard for user:', item.id, 'isLiked:', item.isLiked, 'isSuperLiked:', item.isSuperLiked);
    return (
      <ProfileCard
        profile={item}
        onLike={handleLikeBack}
        onPass={handlePass}
        onSuperLike={handleSuperLike}
        onViewProfile={handleViewProfile}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>いいねを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
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
        keyExtractor={(item) => `${item.id}-${item.isLiked}-${item.isSuperLiked}-${item.isPassed}`}
        numColumns={2}
        contentContainerStyle={styles.likesList}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        extraData={receivedLikes}
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
  row: {
    justifyContent: 'space-between',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
});

export default LikesScreen;
