import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { ProfileCardProps } from "../types";
import Card from "./Card";

const PinOutlineIcon = require("../../assets/images/Icons/Pin-Outline.png");

const { width } = Dimensions.get("window");
const horizontalPadding = Spacing.md * 2;
const interItemSpacing = Spacing.xs;
const cardWidth = (width - horizontalPadding - interItemSpacing) / 2;
const cardHeight = cardWidth * 1.3;
const cardBorderRadius = BorderRadius.xl;

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
        borderRadius={cardBorderRadius}
        testID={testID}
      >
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <ExpoImage
            source={{
              uri:
                profile.profile_pictures[0] ||
                "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
            }}
            style={styles.profileImage}
            contentFit="cover"
            priority="high"
            cachePolicy="memory-disk"
            transition={200}
            accessibilityLabel={`${profile.name}のプロフィール写真`}
          />

          {/* Online Status Indicator - only show if user is online */}
          {isOnline && <View style={styles.onlineIndicator} />}

          {/* Overlay Info */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.75)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.imageOverlay}
          >
            <View style={styles.overlayContent}>
              <View style={[styles.overlayRow, styles.overlayRowTop]}>
                <Text style={styles.overlayAgeText}>
                  {getAgeRange(profile.age)}
                </Text>
                {profile.is_verified && (
                  <View style={styles.verificationPill}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.white} />
                    <Text style={styles.verificationText}>認証</Text>
                  </View>
                )}
                {profile.is_premium && (
                  <View style={styles.premiumPill}>
                    <Ionicons name="diamond" size={12} color={Colors.white} />
                    <Text style={styles.premiumText}>会員</Text>
                  </View>
                )}
              </View>
              <View style={styles.overlayRow}>
                <Image source={PinOutlineIcon} style={styles.pinIcon} />
                <Text style={styles.overlayLocationText}>
                  {profile.prefecture || "未設定"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    width: cardWidth,
    marginRight: Spacing.xs,
  },
  container: {
    width: "100%",
    height: cardHeight,
    borderRadius: cardBorderRadius,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  overlayContent: {
    paddingTop: Spacing.xs,
  },
  overlayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overlayRowTop: {
    marginBottom: Spacing.xs,
  },
  overlayAgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  verificationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(32,178,170,0.85)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  verificationText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(218,165,32,0.9)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  premiumText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  pinIcon: {
    width: 12,
    height: 16,
    tintColor: Colors.white,
    marginRight: Spacing.xs,
    resizeMode: "contain",
  },
  overlayLocationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.white,
  },
});

export default ProfileCard;
