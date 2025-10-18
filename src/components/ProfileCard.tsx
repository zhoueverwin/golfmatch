import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import {
  Spacing,
  BorderRadius,
  Dimensions as AppDimensions,
} from "../constants/spacing";
import { Typography } from "../constants/typography";
import { ProfileCardProps } from "../types";
import { InteractionType } from "../types/dataModels";
import Card from "./Card";

const { width } = Dimensions.get("window");
const cardWidth = (width - Spacing.md * 3) / 2;

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onLike,
  onPass,
  onViewProfile,
}) => {
  // Ensure interaction states have default values
  const isLiked = profile.isLiked ?? false;
  const isPassed = profile.isPassed ?? false;

  console.log(
    "🎨 ProfileCard rendering for user:",
    profile.id,
    "isLiked:",
    isLiked,
    // super like removed
  );

  // Force re-render when profile changes
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    setRenderKey((prev) => prev + 1);
  }, [isLiked, isPassed]);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const passScaleAnim = useRef(new Animated.Value(1)).current;
  // super like removed
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate when interaction state changes
  useEffect(() => {
    if (isLiked) {
      // Pulse animation for liked state
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLiked]);

  const handleLikePress = () => {
    console.log(
      "🔥 ProfileCard handleLikePress called for user:",
      profile.id,
      "current isLiked:",
      isLiked,
    );
    // Button press animation
    Animated.sequence([
      Animated.timing(likeScaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onLike(profile.id);
  };

  const handlePassPress = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(passScaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(passScaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(passScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPass(profile.id);
  };

  // super like removed
  const getAgeRange = (age: number): string => {
    if (age < 25) return "20代前半";
    if (age < 30) return "20代後半";
    if (age < 35) return "30代前半";
    if (age < 40) return "30代後半";
    if (age < 45) return "40代前半";
    if (age < 50) return "40代後半";
    return "50代以上";
  };

  const getSkillLevelText = (level: string): string => {
    switch (level) {
      case "beginner":
        return "ビギナー";
      case "intermediate":
        return "中級者";
      case "advanced":
        return "上級者";
      case "professional":
        return "プロ";
      default:
        return "未設定";
    }
  };

  return (
    <Animated.View
      key={renderKey}
      style={[
        styles.animatedContainer,
        {
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
        },
      ]}
    >
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
              uri:
                profile.profile_pictures[0] ||
                "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
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
          <Animated.View style={{ transform: [{ scale: passScaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.passButton,
                profile.isPassed && styles.passedButton,
              ]}
              onPress={handlePassPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${profile.name}をパス`}
              accessibilityHint="このユーザーをパスします"
            >
              <Ionicons
                name="close"
                size={AppDimensions.iconSize}
                color={isPassed ? Colors.gray[400] : Colors.gray[600]}
              />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
            {(() => {
              console.log(
                "🎨 Rendering like button for user:",
                profile.id,
                "isLiked:",
                isLiked,
              );
              return isLiked;
            })() ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.likedButton]}
                onPress={handleLikePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${profile.name}のいいねを取り消し`}
                accessibilityHint="いいねを取り消します"
              >
                <Ionicons
                  name="heart"
                  size={AppDimensions.iconSize}
                  color={Colors.primary}
                />
                <Text style={styles.likedText}>みてね</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.likeButton]}
                onPress={handleLikePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${profile.name}にいいね`}
                accessibilityHint="このユーザーにいいねを送ります"
              >
                <Ionicons
                  name="heart-outline"
                  size={AppDimensions.iconSize}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            )}
          </Animated.View>

          
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    width: cardWidth,
    marginBottom: Spacing.sm,
  },
  container: {
    width: "100%",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: cardWidth * 1.2,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  onlineIndicator: {
    position: "absolute",
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
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    padding: Spacing.sm,
  },
  ageLocationRow: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  actionButton: {
    width: AppDimensions.touchTarget,
    height: AppDimensions.touchTarget,
    borderRadius: AppDimensions.touchTarget / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  passButton: {
    backgroundColor: Colors.gray[100],
  },
  passedButton: {
    backgroundColor: Colors.gray[200],
  },
  likeButton: {
    backgroundColor: Colors.primary + "20",
  },
  likedButton: {
    backgroundColor: Colors.primary + "30",
    flexDirection: "column",
    paddingVertical: Spacing.xs,
  },
  likedText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 2,
  },
  
});

export default ProfileCard;
