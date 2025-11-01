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
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { ProfileCardProps } from "../types";
import Card from "./Card";

const { width } = Dimensions.get("window");
const cardWidth = (width - Spacing.md * 3) / 2;
const cardHeight = cardWidth * 1.4; // Fixed height for consistent card sizes

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onViewProfile,
  testID,
}) => {
  // Ensure interaction states have default values
  const isLiked = profile.isLiked ?? false;
  const isPassed = profile.isPassed ?? false;
  
  // Calculate if user is online (within last 5 minutes)
  const isOnline = profile.last_active_at 
    ? (new Date().getTime() - new Date(profile.last_active_at).getTime()) < 5 * 60 * 1000
    : false;

  // Force re-render when profile changes
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    setRenderKey((prev) => prev + 1);
  }, [isLiked, isPassed]);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
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
        testID={testID}
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

          {/* Online Status Indicator - only show if user is online */}
          {isOnline && <View style={styles.onlineIndicator} />}

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
            {isOnline && <View style={styles.statusDot} />}
            <Text style={styles.ageLocationText}>
              {getAgeRange(profile.age)}・{profile.prefecture}
            </Text>
          </View>
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
    height: cardHeight,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: cardWidth * 1.15,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flex: 1,
    justifyContent: "center",
    minHeight: cardWidth * 0.25,
  },
  ageLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  ageLocationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.text.primary,
    flex: 1,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
  },
});

export default ProfileCard;
