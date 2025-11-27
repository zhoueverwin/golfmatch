import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import Constants from "expo-constants";

// Conditionally import InAppPurchases - it's not available in Expo Go
let InAppPurchases: any = null;
let isExpoGo = false;

try {
  // Check if we're in Expo Go
  isExpoGo = Constants.executionEnvironment === "storeClient";

  if (!isExpoGo) {
    // Only import if not in Expo Go
    InAppPurchases = require("expo-in-app-purchases");
  }
} catch (error) {
  // If import fails, we're likely in Expo Go
  isExpoGo = true;
  console.warn("[StoreScreen] expo-in-app-purchases not available (likely Expo Go)");
}

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { membershipService } from "../services/membershipService";
import { Membership } from "../types/dataModels";

const { width } = Dimensions.get("window");

type StoreScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Product ID for membership - must match App Store Connect / Google Play Console
const PRODUCT_ID = Platform.OS === "ios"
  ? "com.zhoueverwin.golfmatchapp.membership"
  : "membership_plan";

const MEMBERSHIP_PRICE = 2000;

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<StoreScreenNavigationProp>();
  const { profileId } = useAuth();
  const insets = useSafeAreaInsets();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = React.useRef(false);
  const hasConnectedRef = React.useRef(false);

  useEffect(() => {
    loadMembershipInfo();

    if (!isExpoGo && InAppPurchases) {
      initializeIAP();

      // Set up purchase update listener
      const subscription = InAppPurchases.setPurchaseListener(
        async ({ responseCode, results, errorCode }: { responseCode: any; results: any; errorCode: any }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          if (results && results.length > 0) {
            for (const purchase of results) {
              await handlePurchaseSuccess(purchase);
            }
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          Alert.alert("キャンセル", "購入がキャンセルされました。");
        } else {
          Alert.alert(
            "エラー",
            `購入に失敗しました: ${errorCode || "不明なエラー"}`,
          );
        }
        setIsPurchasing(false);
      },
    );

      return () => {
        if (subscription && subscription.remove) {
          subscription.remove();
        }
      };
    }

    return () => {};
  }, []);

  const initializeIAP = async () => {
    if (isExpoGo || !InAppPurchases) {
      return;
    }

    if (isConnectingRef.current || hasConnectedRef.current) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const connected = await InAppPurchases.connectAsync();

      if (connected === undefined || connected === true) {
        setIsConnected(true);
        hasConnectedRef.current = true;
      } else if (connected === false) {
        Alert.alert(
          "接続エラー",
          "App Storeに接続できませんでした。",
          [{ text: "OK" }]
        );
      }
      isConnectingRef.current = false;
    } catch (error: any) {
      if (error?.code === "ERR_IN_APP_PURCHASES_CONNECTION" ||
          error?.message?.includes("Already connected")) {
        setIsConnected(true);
        hasConnectedRef.current = true;
      }
      isConnectingRef.current = false;
    }
  };

  const loadMembershipInfo = async () => {
    try {
      setIsLoading(true);
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        setIsLoading(false);
        return;
      }

      const result = await membershipService.getMembershipInfo(currentUserId);
      if (result.success && result.data) {
        setMembership(result.data);
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error("[StoreScreen] Error loading membership:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (isExpoGo || !InAppPurchases) {
      Alert.alert(
        "開発モード",
        "In-App Purchasesは開発ビルドでのみ利用可能です。",
      );
      return;
    }

    if (!profileId && !process.env.EXPO_PUBLIC_TEST_USER_ID) {
      Alert.alert("エラー", "ログインが必要です。");
      return;
    }

    try {
      setIsPurchasing(true);

      const { responseCode, results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);

      if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
        Alert.alert("エラー", "商品情報の取得に失敗しました。");
        setIsPurchasing(false);
        return;
      }

      if (!results || results.length === 0) {
        Alert.alert("エラー", "商品が見つかりません。");
        setIsPurchasing(false);
        return;
      }

      await InAppPurchases.purchaseItemAsync(PRODUCT_ID);

    } catch (error: any) {
      if (!error?.message?.toLowerCase().includes("cancel")) {
        Alert.alert("エラー", "購入処理中にエラーが発生しました。");
      }
      setIsPurchasing(false);
    }
  };

  const handlePurchaseSuccess = async (purchase: any) => {
    try {
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;

      if (!currentUserId) {
        throw new Error("User ID not found");
      }

      const result = await membershipService.createMembership(
        currentUserId,
        "basic", // Single plan type
        MEMBERSHIP_PRICE,
        purchase.orderId || purchase.transactionId || "",
        Platform.OS as "ios" | "android",
      );

      if (result.success) {
        Alert.alert(
          "購入完了",
          "メンバーシップが有効になりました。メッセージの送信が可能になりました。",
          [
            {
              text: "OK",
              onPress: () => {
                loadMembershipInfo();
                navigation.goBack();
              },
            },
          ],
        );
      } else {
        throw new Error(result.error || "Failed to create membership");
      }

      if (purchase.acknowledged === false && InAppPurchases) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
      }

    } catch (error: any) {
      Alert.alert("エラー", "購入の処理中にエラーが発生しました。");
    }
  };

  const handleRestorePurchases = async () => {
    if (isExpoGo || !InAppPurchases) {
      Alert.alert(
        "開発モード",
        "In-App Purchasesは開発ビルドでのみ利用可能です。",
      );
      return;
    }

    try {
      setIsPurchasing(true);
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results && results.length > 0) {
          for (const purchase of results) {
            if (purchase.acknowledged === false) {
              await handlePurchaseSuccess(purchase);
            }
          }
          Alert.alert("復元完了", "購入履歴を復元しました。");
        } else {
          Alert.alert("情報", "復元できる購入がありません。");
        }
      } else {
        Alert.alert("エラー", "購入履歴の復元に失敗しました。");
      }
    } catch (error: any) {
      Alert.alert("エラー", "購入履歴の復元中にエラーが発生しました。");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCancelMembership = () => {
    Alert.alert(
      "メンバーシップのキャンセル",
      "メンバーシップをキャンセルすると、メッセージの送信ができなくなります。本当にキャンセルしますか？",
      [
        { text: "いいえ", style: "cancel" },
        {
          text: "キャンセルする",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
              if (!currentUserId) {
                Alert.alert("エラー", "ユーザーIDが見つかりません。");
                return;
              }

              const result = await membershipService.cancelMembership(currentUserId);

              if (result.success) {
                Alert.alert("キャンセル完了", "メンバーシップがキャンセルされました。", [
                  { text: "OK", onPress: () => loadMembershipInfo() },
                ]);
              } else {
                Alert.alert("エラー", result.error || "キャンセルに失敗しました。");
              }
            } catch (error: any) {
              Alert.alert("エラー", "キャンセル処理中にエラーが発生しました。");
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 1)",
            "rgba(156, 255, 252, 0.75)",
            "rgba(0, 184, 177, 0.5)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  const isActiveMember = membership && membership.is_active;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 1)",
          "rgba(156, 255, 252, 0.75)",
          "rgba(0, 184, 177, 0.5)",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.backContent}>
              <Image
                source={require("../../assets/images/Icons/Arrow-LeftGrey.png")}
                style={styles.backIconImage}
                resizeMode="contain"
              />
              <Text style={styles.backLabel}>戻る</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ストア</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Expo Go Warning */}
          {isExpoGo && (
            <View style={styles.warningCard}>
              <Ionicons name="information-circle" size={24} color={Colors.warning} />
              <Text style={styles.warningText}>
                In-App Purchasesは開発ビルドでのみ利用可能です。
              </Text>
            </View>
          )}

          {/* Membership Card */}
          <View style={styles.membershipCard}>
            {isActiveMember ? (
              <>
                {/* Active Membership */}
                <View style={styles.activeStatusBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.activeStatusText}>メンバーシップ有効</Text>
                </View>

                <Text style={styles.cardTitle}>プレミアムメンバー</Text>
                <Text style={styles.cardDescription}>
                  メッセージ機能をご利用いただけます
                </Text>

                {membership.expiration_date && (
                  <View style={styles.expirationInfo}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.text.secondary} />
                    <Text style={styles.expirationText}>
                      有効期限: {formatDate(membership.expiration_date)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelMembership}
                >
                  <Text style={styles.cancelButtonText}>メンバーシップをキャンセル</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* No Membership - Show Purchase Option */}
                <View style={styles.crownIcon}>
                  <Ionicons name="diamond" size={48} color={Colors.primary} />
                </View>

                <Text style={styles.cardTitle}>メンバーシップ</Text>
                <Text style={styles.cardDescription}>
                  メンバーシップに加入すると、{"\n"}
                  メッセージの送信が可能になります
                </Text>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>月額</Text>
                  <Text style={styles.price}>¥{MEMBERSHIP_PRICE.toLocaleString()}</Text>
                </View>

                <View style={styles.featuresContainer}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.featureText}>メッセージの送受信</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.featureText}>マッチした相手と交流</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.featureText}>いつでもキャンセル可能</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
                  onPress={handlePurchase}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.purchaseButtonText}>購入する</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isPurchasing}
          >
            <Text style={styles.restoreButtonText}>購入を復元</Text>
          </TouchableOpacity>

          {/* Terms Link */}
          <TouchableOpacity
            style={styles.termsButton}
            onPress={() => {
              Alert.alert("利用規約", "利用規約へのリンクを実装してください。");
            }}
          >
            <Text style={styles.termsButtonText}>プライバシーポリシーと利用規約</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>価格はすべて税込です。</Text>
            <Text style={styles.footerText}>
              購入後のお支払いは、{Platform.OS === "ios" ? "iTunes" : "Google Play"}アカウントに請求されます。
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIconImage: {
    width: 20,
    height: 20,
  },
  backLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    marginLeft: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  warningCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning + "40",
  },
  warningText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  membershipCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.large,
    marginBottom: Spacing.lg,
  },
  activeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  activeStatusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  crownIcon: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  expirationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  expirationText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  priceContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  priceLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: 36,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.primary,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.full,
    ...Shadows.medium,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  restoreButtonText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  termsButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  termsButtonText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.info,
    textDecorationLine: "underline",
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing.md,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
});

export default StoreScreen;
