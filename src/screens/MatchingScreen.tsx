import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { User } from '../types/dataModels';
import ProfileCard from '../components/ProfileCard';
import Toast from '../components/Toast';
import DataProvider from '../services/dataProvider';

const MatchingScreen: React.FC = () => {
  const [matches, setMatches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
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

  // Load recommended users
  const loadRecommendedUsers = async () => {
    try {
      setLoading(true);
      const response = await DataProvider.getRecommendedUsers('current_user', 20);
      
      if (response.error) {
        console.error('Failed to load recommended users:', response.error);
        setMatches([]);
        showToast('ユーザーの読み込みに失敗しました', 'error');
      } else {
        setMatches(response.data || []);
      }
    } catch (error) {
      console.error('Error loading recommended users:', error);
      setMatches([]);
      showToast('ユーザーの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendedUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadRecommendedUsers();
  }, []);

  // Helper function to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Interaction handlers
  const handleLike = async (userId: string) => {
    try {
      const response = await DataProvider.likeUser('current_user', userId);
      
      if (response.error) {
        console.error('Failed to like user:', response.error);
        showToast('いいねの送信に失敗しました', 'error');
      } else {
        // Find user name for toast message
        const user = matches.find(u => u.id === userId);
        const userName = user?.name || 'ユーザー';
        
        // Update local state to reflect the like
        setMatches(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isLiked: true, interactionType: 'like' }
              : user
          )
        );
        
        showToast(`${userName}にいいねを送りました！`, 'success');
        console.log('Successfully liked user:', userId);
      }
    } catch (error) {
      console.error('Error liking user:', error);
      showToast('いいねの送信に失敗しました', 'error');
    }
  };

  const handlePass = async (userId: string) => {
    try {
      const response = await DataProvider.passUser('current_user', userId);
      
      if (response.error) {
        console.error('Failed to pass user:', response.error);
        showToast('パスの送信に失敗しました', 'error');
      } else {
        // Find user name for toast message
        const user = matches.find(u => u.id === userId);
        const userName = user?.name || 'ユーザー';
        
        // Remove user from the list since they were passed
        setMatches(prev => prev.filter(user => user.id !== userId));
        
        showToast(`${userName}をパスしました`, 'info');
        console.log('Successfully passed user:', userId);
      }
    } catch (error) {
      console.error('Error passing user:', error);
      showToast('パスの送信に失敗しました', 'error');
    }
  };

  const handleSuperLike = async (userId: string) => {
    try {
      const response = await DataProvider.superLikeUser('current_user', userId);
      
      if (response.error) {
        console.error('Failed to super like user:', response.error);
        showToast('スーパーいいねの送信に失敗しました', 'error');
      } else {
        // Find user name for toast message
        const user = matches.find(u => u.id === userId);
        const userName = user?.name || 'ユーザー';
        
        // Update local state to reflect the super like
        setMatches(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isSuperLiked: true, interactionType: 'super_like' }
              : user
          )
        );
        
        showToast(`${userName}にスーパーいいねを送りました！✨`, 'success');
        console.log('Successfully super liked user:', userId);
      }
    } catch (error) {
      console.error('Error super liking user:', error);
      showToast('スーパーいいねの送信に失敗しました', 'error');
    }
  };

  const handleViewProfile = (userId: string) => {
    console.log('View profile:', userId);
    // TODO: Navigate to profile screen
    showToast('プロフィール画面に移動します', 'info');
  };

  const renderMatchCard = ({ item }: { item: User }) => (
    <ProfileCard
      profile={item}
      onLike={handleLike}
      onPass={handlePass}
      onSuperLike={handleSuperLike}
      onViewProfile={handleViewProfile}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>ユーザーを読み込み中...</Text>
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
        <Text style={styles.headerTitle}>マッチング</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="更新"
        >
          <Ionicons name="refresh" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{matches.length}</Text>
          <Text style={styles.statLabel}>おすすめユーザー</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {matches.filter(user => user.isLiked || user.isSuperLiked).length}
          </Text>
          <Text style={styles.statLabel}>いいね済み</Text>
        </View>
      </View>

      {/* Matches Grid */}
      <FlatList
        data={matches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.matchesList}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={Colors.gray[400]} />
            <Text style={styles.emptyTitle}>新しいユーザーがいません</Text>
            <Text style={styles.emptySubtitle}>
              しばらく待ってから更新してみてください
            </Text>
            <TouchableOpacity style={styles.refreshButtonLarge} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>更新する</Text>
            </TouchableOpacity>
          </View>
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
  refreshButton: {
    padding: Spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  matchesList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  refreshButtonLarge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  refreshButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default MatchingScreen;