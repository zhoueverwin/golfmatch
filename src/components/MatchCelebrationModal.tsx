import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MatchCelebrationModalProps {
  visible: boolean;
  matchData: {
    matchId: string;
    otherUser: {
      id: string;
      name: string;
      image: string;
    };
    currentUser?: {
      id: string;
      name: string;
      image: string;
    };
  };
  onSendMessage: () => void;
  onClose: () => void;
}

const MatchCelebrationModal: React.FC<MatchCelebrationModalProps> = ({
  visible,
  matchData,
  onSendMessage,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const profileScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      profileScaleAnim.setValue(0);

      // Start entrance animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate profile images with slight delay
      setTimeout(() => {
        Animated.spring(profileScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 200);
    }
  }, [visible]);

  const containerStyle = {
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }],
  };

  const profileImageStyle = {
    transform: [{ scale: profileScaleAnim }],
  };

  // Default profile image if not provided
  const currentUserImage =
    matchData.currentUser?.image ||
    "https://via.placeholder.com/150/cccccc/ffffff?text=You";
  const otherUserImage =
    matchData.otherUser?.image ||
    "https://via.placeholder.com/150/cccccc/ffffff?text=User";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, containerStyle]}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <SafeAreaView style={styles.content}>
              {/* Title */}
              <Text style={styles.title}>マッチングが成立しました！</Text>

              {/* Subtitle */}
              <Text style={styles.subtitle}>おめでとうございます！</Text>

              {/* Profile Images */}
              <View style={styles.profileImagesContainer}>
                <Animated.View style={profileImageStyle}>
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={{ uri: currentUserImage }}
                      style={styles.profileImage}
                      resizeMode="cover"
                    />
                  </View>
                </Animated.View>

                <View style={styles.profileSpacer} />

                <Animated.View style={profileImageStyle}>
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={{ uri: otherUserImage }}
                      style={styles.profileImage}
                      resizeMode="cover"
                    />
                  </View>
                </Animated.View>
              </View>

              {/* Message Prompt */}
              <Text style={styles.messagePrompt}>
                メッセージを送ってラウンドに誘ってみましょう！
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={styles.sendMessageButton}
                  onPress={onSendMessage}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="メッセージを送る"
                  accessibilityHint="マッチした相手にメッセージを送ります"
                >
                  <Text style={styles.sendMessageButtonText}>
                    メッセージを送る
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="戻る"
                  accessibilityHint="マッチ画面を閉じます"
                >
                  <Text style={styles.closeButtonText}>戻る</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize["2xl"],
  },
  subtitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.xl,
    opacity: 0.95,
  },
  profileImagesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xl,
  },
  profileImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileSpacer: {
    width: Spacing.lg,
  },
  messagePrompt: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.normal),
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    opacity: 0.95,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  sendMessageButton: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  sendMessageButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.primary,
  },
  closeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  closeButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.normal),
    color: Colors.white,
    textAlign: "center",
    opacity: 0.9,
  },
});

export default MatchCelebrationModal;

