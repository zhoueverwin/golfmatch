import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius, Dimensions as AppDimensions } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { ProfileCardProps } from '../types';
import Card from './Card';

const { width } = Dimensions.get('window');
const cardWidth = (width - Spacing.md * 3) / 2;

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onLike,
  onPass,
  onViewProfile,
}) => {
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

  return (
    <Card
      style={styles.container}
      onPress={() => onViewProfile(profile.id)}
      shadow="medium"
      padding="none"
    >
      {/* Profile Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ 
            uri: profile.profile_pictures[0] || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
          }}
          style={styles.profileImage}
          resizeMode="cover"
          accessibilityLabel={`${profile.name}のプロフィール写真`}
        />
        
        {/* Online Status Indicator */}
        <View style={styles.onlineIndicator} />
        
        {/* Verification Badge */}
        {profile.is_verified && (
          <View style={styles.verificationBadge}>
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          </View>
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.infoContainer}>
        <View style={styles.ageLocationRow}>
          <View style={styles.statusDot} />
          <Text style={styles.ageLocationText}>
            {getAgeRange(profile.age)}・{profile.prefecture}
          </Text>
        </View>
        
        <Text style={styles.skillLevelText}>
          {getSkillLevelText(profile.golf_skill_level)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => onPass(profile.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${profile.name}をパス`}
          accessibilityHint="このユーザーをパスします"
        >
          <Ionicons name="close" size={AppDimensions.iconSize} color={Colors.gray[600]} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => onLike(profile.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${profile.name}にいいね`}
          accessibilityHint="このユーザーにいいねを送ります"
        >
          <Ionicons name="heart" size={AppDimensions.iconSize} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: cardWidth * 1.2,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  onlineIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: Spacing.sm,
  },
  ageLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  ageLocationText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    flex: 1,
  },
  skillLevelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  actionButton: {
    width: AppDimensions.touchTarget,
    height: AppDimensions.touchTarget,
    borderRadius: AppDimensions.touchTarget / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passButton: {
    backgroundColor: Colors.gray[100],
  },
  likeButton: {
    backgroundColor: Colors.primary + '20',
  },
});

export default ProfileCard;
