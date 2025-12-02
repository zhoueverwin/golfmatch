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
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PROFILE_IMAGE_SIZE = SCREEN_WIDTH * 0.32;

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const profileScaleAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      titleAnim.setValue(0);
      profileScaleAnim.setValue(0);
      logoAnim.setValue(0);
      buttonsAnim.setValue(0);

      // Start entrance animations in sequence
      Animated.sequence([
        // Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Animate title
        Animated.spring(titleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate logo with delay
      setTimeout(() => {
        Animated.spring(logoAnim, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 200);

      // Animate profile images with delay
      setTimeout(() => {
        Animated.spring(profileScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 300);

      // Animate buttons with delay
      setTimeout(() => {
        Animated.spring(buttonsAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 500);
    }
  }, [visible]);

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
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={["#2CBCB4", "#21B2AA", "#1BA8A0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.content}>
            {/* Title Section */}
            <Animated.View
              style={[
                styles.titleContainer,
                {
                  opacity: titleAnim,
                  transform: [
                    {
                      translateY: titleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.congratsText}>おめでとうございます！</Text>
              <Text style={styles.matchTitle}>マッチングが成立しました！</Text>
            </Animated.View>

            {/* Profile Images with Logo */}
            <View style={styles.profileSection}>
              {/* Center Logo */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: logoAnim,
                    transform: [
                      {
                        scale: logoAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={require("../../assets/Vector.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* Profile Images */}
              <View style={styles.profileImagesContainer}>
                <Animated.View
                  style={[
                    styles.profileImageWrapper,
                    styles.leftProfile,
                    {
                      opacity: profileScaleAnim,
                      transform: [
                        {
                          scale: profileScaleAnim,
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={{ uri: currentUserImage }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.profileImageWrapper,
                    styles.rightProfile,
                    {
                      opacity: profileScaleAnim,
                      transform: [
                        {
                          scale: profileScaleAnim,
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={{ uri: otherUserImage }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                </Animated.View>
              </View>
            </View>

            {/* Message Prompt */}
            <Animated.View
              style={[
                styles.promptContainer,
                {
                  opacity: buttonsAnim,
                  transform: [
                    {
                      translateY: buttonsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.messagePrompt}>
                メッセージを送ってラウンド{"\n"}に誘ってみましょう！
              </Text>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View
              style={[
                styles.buttonsContainer,
                {
                  opacity: buttonsAnim,
                  transform: [
                    {
                      translateY: buttonsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
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
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  congratsText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  matchTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
    textAlign: "center",
  },
  profileSection: {
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  logoContainer: {
    marginBottom: -Spacing.md,
    zIndex: 10,
  },
  logoImage: {
    width: 50,
    height: 50,
    tintColor: Colors.white,
  },
  profileImagesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageWrapper: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  leftProfile: {
    marginRight: Spacing.md,
  },
  rightProfile: {
    marginLeft: Spacing.md,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  promptContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  messagePrompt: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.normal,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.normal),
    color: Colors.white,
    textAlign: "center",
    lineHeight: Typography.fontSize.lg * 1.5,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  sendMessageButton: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendMessageButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.primary,
  },
  closeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  closeButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.normal),
    color: Colors.white,
    textAlign: "center",
  },
});

export default MatchCelebrationModal;
