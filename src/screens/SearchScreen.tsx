import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { Profile, SearchFilters } from '../types';
import ProfileCard from '../components/ProfileCard';
import FilterModal from '../components/FilterModal';

const SearchScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'registration'>('recommended');
  const [filters, setFilters] = useState<SearchFilters>({});

  // Mock data for development
  useEffect(() => {
    const mockProfiles: Profile[] = [
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
      {
        id: '6',
        user_id: '6',
        name: 'Rin',
        age: 27,
        gender: 'female',
        location: '大阪府',
        prefecture: '大阪府',
        golf_skill_level: 'beginner',
        profile_pictures: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
        is_verified: false,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    setProfiles(mockProfiles);
    setLoading(false);
  }, []);

  const handleLike = (userId: string) => {
    console.log('Liked user:', userId);
    // TODO: Implement like functionality
  };

  const handlePass = (userId: string) => {
    console.log('Passed user:', userId);
    // TODO: Implement pass functionality
  };

  const handleViewProfile = (userId: string) => {
    console.log('View profile:', userId);
    // TODO: Navigate to profile screen
  };

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
    // TODO: Apply filters to search
  };

  const renderProfileCard = ({ item }: { item: Profile }) => (
    <ProfileCard
      profile={item}
      onLike={handleLike}
      onPass={handlePass}
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
              activeTab === 'recommended' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('recommended')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'recommended' && styles.activeTabText,
              ]}
            >
              おすすめ
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'registration' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('registration')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'registration' && styles.activeTabText,
              ]}
            >
              登録順
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Profile Grid */}
      <FlatList
        data={profiles}
        renderItem={renderProfileCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.profileGrid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
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
  },
  profileGrid: {
    padding: Spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
});

export default SearchScreen;
