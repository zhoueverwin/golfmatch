import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { Post } from '../types/dataModels';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import ImageCarousel from '../components/ImageCarousel';
import PostCreationModal from '../components/PostCreationModal';
import FullscreenImageViewer from '../components/FullscreenImageViewer';
import DataProvider from '../services/dataProvider';

// const { width } = Dimensions.get('window'); // Unused for now

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'following'>('recommended');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  // Refresh posts when screen comes into focus (e.g., after creating a new post)
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [activeTab])
  );

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = activeTab === 'recommended' 
        ? await DataProvider.getRecommendedPosts()
        : await DataProvider.getFollowingPosts();
      
      if (response.error) {
        console.error('Failed to load posts:', response.error);
        setPosts([]);
      } else {
        setPosts(response.data || []);
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handleSuperLike = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              isSuperLiked: !post.isSuperLiked,
              isLiked: false,
              likes: post.isSuperLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  // const handleComment = (postId: string) => {
  //   console.log('Comment on post:', postId);
  //   // TODO: Navigate to comments
  // };

  const handleViewProfile = (userId: string) => {
    console.log('View profile:', userId);
    navigation.navigate('Profile', { userId });
  };

  const handleMessage = (userId: string, userName: string, userImage: string) => {
    console.log('Message user:', userId);
    navigation.navigate('Chat', { 
      userId, 
      userName, 
      userImage 
    });
  };

  const handleCreatePost = async (postData: { text: string; images: string[]; videos: string[] }) => {
    try {
      // Use centralized data provider to create post
      const response = await DataProvider.createPost({
        ...postData,
        userId: 'current_user' // In real app, this would be the current user's ID
      });

      if (response.error) {
        console.error('Failed to create post:', response.error);
        throw new Error(response.error);
      }

      if (response.data) {
        // Add to top of posts
        setPosts(prevPosts => [response.data!, ...prevPosts]);
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const handleImagePress = (images: string[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isTextOnly = item.images.length === 0 && item.videos?.length === 0;
    
    return (
      <Card style={[
        styles.postCard,
        isTextOnly && styles.textOnlyPostCard
      ]} shadow="small">
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleViewProfile(item.user.id)}
        >
          <Image
            source={{ uri: item.user.profile_pictures[0] }}
            style={styles.profileImage}
            accessibilityLabel={`${item.user.name}のプロフィール写真`}
          />
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{item.user.name}</Text>
              {item.user.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
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

      {/* Post Videos */}
      {item.videos && item.videos.length > 0 && (
        <View style={styles.videoContainer}>
          {item.videos.map((video, index) => (
            <View key={index} style={styles.videoItem}>
              <View style={styles.videoPlaceholder}>
                <Ionicons name="play-circle" size={40} color={Colors.primary} />
                <Text style={styles.videoText}>動画</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.isLiked ? 'いいねを取り消し' : 'いいね'}
          >
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={item.isLiked ? Colors.error : Colors.gray[600]}
            />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSuperLike(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.isSuperLiked ? 'スーパーいいねを取り消し' : 'スーパーいいね'}
          >
            <Ionicons
              name={item.isSuperLiked ? 'star' : 'star-outline'}
              size={24}
              color={item.isSuperLiked ? Colors.warning : Colors.gray[600]}
            />
            <Text style={styles.actionText}>Super</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, item.user.id === 'current_user' && styles.disabledButton]}
            onPress={() => item.user.id !== 'current_user' && handleMessage(item.user.id, item.user.name, item.user.profile_pictures[0])}
            accessibilityRole="button"
            accessibilityLabel={item.user.id === 'current_user' ? '自分の投稿にはメッセージできません' : 'メッセージ'}
            disabled={item.user.id === 'current_user'}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={24} 
              color={item.user.id === 'current_user' ? Colors.gray[400] : Colors.gray[600]} 
            />
            <Text style={[styles.actionText, item.user.id === 'current_user' && styles.disabledText]}>
              メッセージ
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading text="フィードを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Ionicons name="golf" size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>GolfMatch</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowPostModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommended' && styles.activeTab]}
          onPress={() => setActiveTab('recommended')}
        >
          <Text style={[styles.tabText, activeTab === 'recommended' && styles.activeTabText]}>
            おすすめ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            フォロー中
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="home-outline"
            title="フィードが空です"
            subtitle="新しい投稿を待っています"
            buttonTitle="プロフィールを探す"
            onButtonPress={() => console.log('Go to search')}
          />
        }
      />

      {/* Post Creation Modal */}
      <PostCreationModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPublish={handleCreatePost}
      />

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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[600],
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginLeft: Spacing.xs,
  },
  feedContainer: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  postCard: {
    marginBottom: Spacing.md,
  },
  textOnlyPostCard: {
    minHeight: 'auto',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
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
    color: Colors.text.secondary,
  },
  moreButton: {
    padding: Spacing.sm,
  },
  postContent: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    marginBottom: Spacing.md,
  },
  imageCarousel: {
    marginTop: Spacing.sm,
  },
  videoContainer: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  videoItem: {
    width: '48%',
    aspectRatio: 16/9,
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
    padding: Spacing.xs,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.gray[400],
  },
  shareButton: {
    padding: Spacing.xs,
  },
});

export default HomeScreen;
