import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { UserProfile, CalendarData, Post } from '../types/dataModels';
import Card from '../components/Card';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import GolfCalendar from '../components/GolfCalendar';
import ImageCarousel from '../components/ImageCarousel';
import FullscreenImageViewer from '../components/FullscreenImageViewer';
import { DataProvider } from '../services';

const { width } = Dimensions.get('window');

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;
type UserProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const UserProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(10);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoadingLike, setIsLoadingLike] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCalendarData();
    loadPosts();
    checkIfLiked();
  }, [userId]);

  // Refresh posts when screen comes into focus (e.g., after creating a new post)
  useFocusEffect(
    useCallback(() => {
      if (userId === 'current_user') {
        // Only refresh posts for current user (My Page)
        loadPosts();
      }
    }, [userId])
  );

  const loadProfile = async () => {
    try {
      const response = await DataProvider.getUserProfile(userId);
      if (response.error) {
        console.error('Failed to load profile:', response.error);
      } else {
        setProfile(response.data || null);
      }
    } catch (_error) {
      console.error('Error loading profile:', _error);
    }
  };

  const loadCalendarData = async (year?: number, month?: number) => {
    try {
      const response = await DataProvider.getCalendarData(userId, year || currentYear, month || currentMonth);
      if (response.error) {
        console.error('Failed to load calendar:', response.error);
      } else {
        setCalendarData(response.data || null);
      }
    } catch (_error) {
      console.error('Error loading calendar:', _error);
    }
  };

  const handleMonthChange = async (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    await loadCalendarData(year, month);
  };

  const handleImagePress = (images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  };

  const loadPosts = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setPostsLoading(true);
      }

      const page = loadMore ? Math.ceil(posts.length / 10) + 1 : 1;
      console.log(`Loading posts for user ${userId}, page ${page}, loadMore: ${loadMore}`);
      
      const response = await DataProvider.getUserPosts(userId, page);
      
      if (response.error) {
        console.error('Failed to load posts:', response.error);
        setPosts([]);
      } else {
        console.log(`Loaded ${response.data?.length || 0} posts for user ${userId}`);
        if (loadMore) {
          // Generate unique IDs for new posts to avoid duplicate keys
          const newPosts = (response.data || []).map((post, index) => ({
            ...post,
            id: `${post.id}-${Date.now()}-${index}`,
          }));
          setPosts(prevPosts => [...prevPosts, ...newPosts]);
          setHasMorePosts(response.pagination?.hasMore || false);
        } else {
          setPosts(response.data || []);
          setHasMorePosts(response.pagination?.hasMore || false);
        }
      }
    } catch (_error) {
      console.error('Error loading posts:', _error);
      setPosts([]);
    } finally {
      setLoading(false);
      setPostsLoading(false);
    }
  }, [userId, posts.length]);

  const checkIfLiked = async () => {
    try {
      // For now, we'll use a mock current user ID
      // In a real app, this would come from authentication
      const currentUserId = 'current_user';
      
      if (userId === currentUserId) {
        setIsLiked(false); // Can't like yourself
        return;
      }

      const response = await DataProvider.getUserInteractions(currentUserId);
      if (response.data) {
        const hasLiked = response.data.some(
          interaction => interaction.liked_user_id === userId && interaction.type === 'like'
        );
        setIsLiked(hasLiked);
      } else {
        setIsLiked(false);
      }
    } catch (_error) {
      console.error('Error checking like status:', _error);
      setIsLiked(false);
    }
  };

  const handleLike = async () => {
    if (isLoadingLike || isLiked) return;

    setIsLoadingLike(true);
    try {
      // For now, we'll use a mock current user ID
      // In a real app, this would come from authentication
      const currentUserId = 'current_user';
      
      if (userId === currentUserId) {
        console.log('Cannot like yourself');
        return;
      }

      const response = await DataProvider.likeUser(currentUserId, userId);
      if (response.error) {
        console.error('Failed to like user:', response.error);
      } else {
        setIsLiked(true);
        console.log('Successfully liked user:', userId);
      }
    } catch (_error) {
      console.error('Error liking user:', _error);
    } finally {
      setIsLoadingLike(false);
    }
  };

  const handleMessage = () => {
    if (profile) {
      navigation.navigate('Chat', {
        userId,
        userName: profile.basic.name,
        userImage: profile.profile_pictures[0],
      });
    }
  };

  const handleViewProfile = (postUserId: string) => {
    if (postUserId !== userId) {
      navigation.navigate('Profile', { userId: postUserId });
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.postCard} shadow="small">
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleViewProfile(item.user.id)}
        >
          <Image
            source={{ uri: item.user.profile_pictures[0] }}
            style={styles.smallProfileImage}
            accessibilityLabel={`${item.user.name}のプロフィール写真`}
          />
          <View style={styles.userDetails}>
            <View style={styles.postNameRow}>
              <Text style={styles.username}>{item.user.name}</Text>
              {item.user.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      {item.content && (
        <Text style={styles.postContent}>{item.content}</Text>
      )}

      {/* Post Images */}
      {item.images.length > 0 && (
        <ImageCarousel 
          images={item.images} 
          style={styles.imageCarousel}
          onImagePress={(index) => handleImagePress(item.images, index)}
        />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike()}
            accessibilityRole="button"
            accessibilityLabel="いいね"
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={item.isLiked ? Colors.error : Colors.gray[600]} 
            />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike()}
            accessibilityRole="button"
            accessibilityLabel="スーパーいいね"
          >
            <Ionicons 
              name="star" 
              size={24} 
              color={item.isSuperLiked ? Colors.warning : Colors.gray[600]} 
            />
            <Text style={styles.actionText}>Super</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMessage()}
            accessibilityRole="button"
            accessibilityLabel="メッセージ"
          >
            <Ionicons name="chatbubble-outline" size={24} color={Colors.gray[600]} />
            <Text style={styles.actionText}>メッセージ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderProfileSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderProfileItem = (label: string, value: string) => (
    <View style={styles.profileItem}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <EmptyState 
          title="プロフィールが見つかりません"
          subtitle="このユーザーのプロフィールを表示できません。"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Top Section - Profile Image */}
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: profile.profile_pictures[0] }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>

        {/* Basic Info Section */}
        <View style={styles.basicInfoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profile.basic.name}</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {profile.status?.is_verified ? 'Verified' : 'Online'}
              </Text>
            </View>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.gray[600]} />
            <Text style={styles.locationText}>{profile.location}</Text>
          </View>
          
          {profile.golf.round_fee && (
            <View style={styles.roundFeeRow}>
              <Text style={styles.roundFeeText}>
                ラウンド料金: {profile.golf.round_fee}
              </Text>
              <TouchableOpacity>
                <Text style={styles.roundFeeLink}>ラウンド料金とは</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Self Introduction Section */}
        {renderProfileSection('自己紹介', (
          <Text style={styles.bioText}>{profile.bio}</Text>
        ))}

        {/* Golf Availability Calendar */}
        {calendarData && renderProfileSection('ゴルフ可能日', (
          <GolfCalendar 
            calendarData={calendarData}
            onDatePress={(date) => console.log('Date pressed:', date)}
            onMonthChange={handleMonthChange}
            currentYear={currentYear}
            currentMonth={currentMonth}
          />
        ))}

        {/* Golf Profile Section */}
        {renderProfileSection('ゴルフプロフィール', (
          <View style={styles.profileGrid}>
            {renderProfileItem('ゴルフ歴', profile.golf.experience)}
            {renderProfileItem('平均スコア', profile.golf.average_score)}
            {profile.golf.best_score && renderProfileItem('ベストスコア', profile.golf.best_score)}
            {renderProfileItem('移動手段', profile.golf.transportation)}
            {renderProfileItem('プレイフィー', profile.golf.play_fee)}
            {renderProfileItem('ラウンド可能日', profile.golf.available_days)}
          </View>
        ))}

        {/* Basic Profile Section */}
        {renderProfileSection('基本プロフィール', (
          <View style={styles.profileGrid}>
            {renderProfileItem('年齢', profile.basic.age)}
            {renderProfileItem('居住地', profile.basic.prefecture)}
            {renderProfileItem('血液型', profile.basic.blood_type)}
            {profile.basic.favorite_club && renderProfileItem('好きなクラブ', profile.basic.favorite_club)}
            {renderProfileItem('身長', profile.basic.height + ' cm')}
            {renderProfileItem('体型', profile.basic.body_type)}
            {renderProfileItem('タバコ', profile.basic.smoking)}
            {profile.basic.personality_type && renderProfileItem('16 パーソナリティ', profile.basic.personality_type)}
          </View>
        ))}

        {/* Posts Section */}
        {renderProfileSection('投稿', (
          <View>
            {posts.length > 0 ? (
              <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  hasMorePosts ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => loadPosts(true)}
                      disabled={postsLoading}
                    >
                      <Text style={styles.loadMoreText}>
                        {postsLoading ? '読み込み中...' : '次のページ'}
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            ) : (
              <EmptyState 
                title="投稿がありません"
                subtitle="このユーザーはまだ投稿していません。"
              />
            )}
          </View>
        ))}

        {/* Bottom Spacing for Like Button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Like Button - Fixed at Bottom */}
      <View style={styles.likeButtonContainer}>
        <TouchableOpacity
          style={[
            styles.likeButton,
            isLiked && styles.likeButtonLiked,
            isLoadingLike && styles.likeButtonLoading
          ]}
          onPress={handleLike}
          disabled={isLoadingLike || isLiked}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? "いいね済み" : "いいね"}
        >
          {isLoadingLike ? (
            <Text style={styles.likeButtonText}>処理中...</Text>
          ) : (
            <Text style={[
              styles.likeButtonText,
              isLiked && styles.likeButtonTextLiked
            ]}>
              {isLiked ? "いいね済み" : "いいね"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Fullscreen Image Viewer */}
      <FullscreenImageViewer
        visible={showImageViewer}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        onClose={() => setShowImageViewer(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    width: '100%',
    height: width * 1.2, // Full width with good aspect ratio
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  basicInfoSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    marginLeft: Spacing.xs,
  },
  roundFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundFeeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  roundFeeLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  bioText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  profileGrid: {
    gap: Spacing.sm,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  profileLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    flex: 1,
  },
  profileValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  postCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smallProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginRight: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
  },
  moreButton: {
    padding: Spacing.xs,
  },
  postContent: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    marginBottom: Spacing.md,
  },
  imageCarousel: {
    marginBottom: Spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
  },
  shareButton: {
    padding: Spacing.xs,
  },
  loadMoreButton: {
    backgroundColor: Colors.gray[100],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  loadMoreText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  bottomSpacing: {
    height: 100, // Space for fixed like button
  },
  likeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  likeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  likeButtonLiked: {
    backgroundColor: Colors.gray[300],
  },
  likeButtonLoading: {
    backgroundColor: Colors.gray[400],
  },
  likeButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  likeButtonTextLiked: {
    color: Colors.gray[600],
  },
});

export default UserProfileScreen;