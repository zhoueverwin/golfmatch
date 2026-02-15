import React, { memo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { ProfileCardProps } from "../types";
import Card from "./Card";
import { getAgeRange, calculateAge, isUserOnline } from "../utils/formatters";

const PinOutlineIcon = require("../../assets/images/Icons/Pin-Outline.png");
const verifyBadge = require("../../assets/images/badges/Verify.png");
const goldBadge = require("../../assets/images/badges/Gold.png");

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
  // Calculate if user is online using shared utility
  const isOnline = isUserOnline(profile.last_active_at);

  const profileImage = profile.profile_pictures[0] ||
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face";

  return (
    <View
      style={[
        styles.animatedContainer,
        // Remove animated transform for stability testing
        // {
        //   transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
        // },
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
            source={{ uri: profileImage }}
            style={styles.profileImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            placeholderContentFit="cover"
            recyclingKey={profileImage} // Important for FlashList recycling
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
                  {getAgeRange(profile.birth_date ? calculateAge(profile.birth_date) : profile.age)}
                </Text>
                {profile.is_verified && (
                  <View style={styles.verificationPill}>
                    <Image source={verifyBadge} style={styles.badgeIcon} resizeMode="contain" />
                  </View>
                )}
                {profile.is_premium && (
                  <View style={styles.premiumPill}>
                    <Image source={goldBadge} style={styles.badgeIcon} resizeMode="contain" />
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
    </View>
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
    marginLeft: Spacing.xs,
  },
  premiumPill: {
    marginLeft: Spacing.xs,
  },
  badgeIcon: {
    width: 16,
    height: 16,
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

// Custom comparison function for memo - only re-render when essential props change
const areEqual = (prevProps: ProfileCardProps, nextProps: ProfileCardProps) => {
  return (
    prevProps.profile.id === nextProps.profile.id &&
    prevProps.profile.isLiked === nextProps.profile.isLiked &&
    prevProps.profile.isPassed === nextProps.profile.isPassed &&
    prevProps.profile.profile_pictures[0] === nextProps.profile.profile_pictures[0]
  );
};

export default memo(ProfileCard, areEqual);
