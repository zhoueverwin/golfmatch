import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { DataProvider } from '../services/dataProvider';
import { UserActivityService } from '../services/userActivityService';
import UserListModal from '../components/UserListModal';
import { UserListItem } from '../types/userActivity';

type MyPageScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const MyPageScreen: React.FC = () => {
  const navigation = useNavigation<MyPageScreenNavigationProp>();
  const [profileCompletion] = useState(62);
  const [likesCount] = useState(89);
  const [userName, setUserName] = useState('じょー');
  const [profileImage, setProfileImage] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face');
  
  // Modal states
  const [showFootprintModal, setShowFootprintModal] = useState(false);
  const [showPastLikesModal, setShowPastLikesModal] = useState(false);
  const [footprintUsers, setFootprintUsers] = useState<UserListItem[]>([]);
  const [pastLikesUsers, setPastLikesUsers] = useState<UserListItem[]>([]);
  const [footprintCount, setFootprintCount] = useState(0);
  const [pastLikesCount, setPastLikesCount] = useState(0);

  // Load user profile data
  const loadUserProfile = async () => {
    try {
      const response = await DataProvider.getUserProfile('current_user');
      if (response.data) {
        setUserName(response.data.basic.name);
        if (response.data.profile_pictures.length > 0) {
          setProfileImage(response.data.profile_pictures[0]);
        }
      }
    } catch (_error) {
      console.error('Error loading user profile:', _error);
    }
  };

  // Load activity data
  const loadActivityData = async () => {
    try {
      const [footprints, pastLikes, footprintCountResult, pastLikesCountResult] = await Promise.all([
        UserActivityService.getFootprints('current_user'),
        UserActivityService.getPastLikes('current_user'),
        UserActivityService.getFootprintCount('current_user'),
        UserActivityService.getPastLikesCount('current_user'),
      ]);
      
      setFootprintUsers(footprints);
      setPastLikesUsers(pastLikes);
      setFootprintCount(footprintCountResult);
      setPastLikesCount(pastLikesCountResult);
    } catch (_error) {
      console.error('Error loading activity data:', _error);
    }
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    loadUserProfile();
    loadActivityData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      loadActivityData();
    }, [])
  );

  // Handlers
  const handleFootprintPress = () => {
    setShowFootprintModal(true);
  };

  const handlePastLikesPress = () => {
    setShowPastLikesModal(true);
  };

  const handleUserPress = (user: UserListItem) => {
    // Close modal and navigate to user profile
    setShowFootprintModal(false);
    setShowPastLikesModal(false);
    navigation.navigate('Profile', { userId: user.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: 'current_user' })}>
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: 'current_user' })}>
              <Text style={styles.profileName}>{userName}</Text>
            </TouchableOpacity>
            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.profileActionButton}
                onPress={() => navigation.navigate('Profile', { userId: 'current_user' })}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="person-circle" size={18} color={Colors.white} />
                </View>
                <Text style={styles.profileActionText}>マイプロフィール</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editActionButton}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIconContainerSecondary}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.editActionText}>編集</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.completionText}>
              プロフィール充実度 {profileCompletion}%
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${profileCompletion}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Completion Banner */}
        <TouchableOpacity style={styles.completionBanner}>
          <Text style={styles.completionBannerText}>
            プロフィールを充実させてマッチング率アップ!
          </Text>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="heart" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="storefront" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statLabel}>ゴルマチストア</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleFootprintPress}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="footsteps" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>足あと</Text>
            </View>
            <View style={styles.menuItemRight}>
              {footprintCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{footprintCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePastLikesPress}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>過去のいいね</Text>
            </View>
            <View style={styles.menuItemRight}>
              {pastLikesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pastLikesCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>カレンダー</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>お知らせ</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="golf" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>ラウンド予定</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>お問い合わせ返信</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>各種設定</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle" size={20} color={Colors.gray[600]} />
              <Text style={styles.menuItemText}>ヘルプ</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <UserListModal
        visible={showFootprintModal}
        onClose={() => setShowFootprintModal(false)}
        title="足あと"
        users={footprintUsers}
        onUserPress={handleUserPress}
      />

      <UserListModal
        visible={showPastLikesModal}
        onClose={() => setShowPastLikesModal(false)}
        title="過去のいいね"
        users={pastLikesUsers}
        onUserPress={handleUserPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  profileActionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    flex: 1,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  editActionButton: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    flex: 1,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainerSecondary: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  completionBanner: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  completionBannerText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: Spacing.sm,
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: Colors.badgeTeal,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default MyPageScreen;
