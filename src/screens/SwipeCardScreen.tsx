import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import { RootStackParamList } from "../types";
import { SwipeCardWithRef, SwipeCardRef } from "../components/SwipeCard";
import { getSwipeCardData } from "../services/swipeCardData";
import { useAuth } from "../contexts/AuthContext";
import { userInteractionService } from "../services/userInteractionService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;

type SwipeCardScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const SwipeCardScreen: React.FC = () => {
  const navigation = useNavigation<SwipeCardScreenNavigationProp>();
  const { profileId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipeCardRef = useRef<SwipeCardRef>(null);

  useEffect(() => {
    const data = getSwipeCardData();
    if (data) {
      setUsers(data.users);
      setCurrentIndex(data.startIndex);
    }
  }, []);

  const handleSwipeRight = useCallback(
    (user: User) => {
      if (!profileId) return;
      userInteractionService.likeUser(profileId, user.id);
      setCurrentIndex((prev) => prev + 1);
    },
    [profileId],
  );

  const handleSwipeLeft = useCallback(
    (user: User) => {
      if (!profileId) return;
      userInteractionService.passUser(profileId, user.id);
      setCurrentIndex((prev) => prev + 1);
    },
    [profileId],
  );

  const handleTapProfile = useCallback(
    (user: User) => {
      navigation.navigate("Profile", { userId: user.id });
    },
    [navigation],
  );

  const isExhausted = currentIndex >= users.length;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isExhausted ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color={Colors.gray[300]}
            />
            <Text style={styles.emptyTitle}>全てのカードを確認しました</Text>
            <Text style={styles.emptySubtitle}>
              さがすページに戻って、もっと見つけましょう
            </Text>
            <TouchableOpacity
              style={styles.backToSearchButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backToSearchButtonText}>
                新しいユーザーを探す
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cardContainer}>
              <SwipeCardWithRef
                ref={swipeCardRef}
                users={users}
                currentIndex={currentIndex}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onTapProfile={handleTapProfile}
                cardHeight={CARD_HEIGHT}
              />
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.skipButton]}
                onPress={() => swipeCardRef.current?.triggerSwipe("left")}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={26} color={Colors.gray[400]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.likeButton]}
                onPress={() => swipeCardRef.current?.triggerSwipe("right")}
                activeOpacity={0.7}
              >
                <Ionicons name="heart" size={30} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  skipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  backToSearchButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  backToSearchButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
});

export default SwipeCardScreen;
