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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

type StoreScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Product IDs - these must match what's configured in App Store Connect / Google Play Console
const PRODUCT_IDS = {
  BASIC: Platform.OS === "ios" ? "com.golfmatch.basic" : "basic_plan",
  PERMANENT: Platform.OS === "ios" ? "com.golfmatch.permanent" : "permanent_plan",
};

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<StoreScreenNavigationProp>();
  const { profileId } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState<"basic" | "permanent" | null>(null);

  useEffect(() => {
    loadMembershipInfo();
    
    if (!isExpoGo && InAppPurchases) {
      initializeIAP();
      
      // Set up purchase update listener
      const subscription = InAppPurchases.setPurchaseListener(
        async ({ responseCode, results, errorCode }) => {
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
        setPurchasingPlan(null);
      },
    );

      return () => {
        subscription.remove();
      };
    }
  }, []);

  const initializeIAP = async () => {
    if (isExpoGo || !InAppPurchases) {
      console.warn("[StoreScreen] IAP not available in Expo Go");
      return;
    }
    
    try {
      const connected = await InAppPurchases.connectAsync();
      if (!connected) {
        console.error("[StoreScreen] Failed to connect to IAP");
      }
    } catch (error) {
      console.error("[StoreScreen] Error initializing IAP:", error);
    }
  };

  const loadMembershipInfo = async () => {
    try {
      setIsLoading(true);
      const currentUserId =
        profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
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

  const handlePurchase = async (planType: "basic" | "permanent") => {
    if (isExpoGo || !InAppPurchases) {
      Alert.alert(
        "開発モード",
        "In-App Purchasesは開発ビルドでのみ利用可能です。\n\n" +
        "テストするには:\n" +
        "1. npx expo run:android または npx expo run:ios で開発ビルドを作成\n" +
        "2. または EAS Build を使用してクラウドビルドを作成\n\n" +
        "Expo GoではIn-App Purchases機能は利用できません。",
      );
      return;
    }

    if (!profileId && !process.env.EXPO_PUBLIC_TEST_USER_ID) {
      Alert.alert("エラー", "ログインが必要です。");
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchasingPlan(planType);

      const productId =
        planType === "basic" ? PRODUCT_IDS.BASIC : PRODUCT_IDS.PERMANENT;

      // Check if product is available
      const { responseCode, results } = await InAppPurchases.getProductsAsync([
        productId,
      ]);

      if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
        throw new Error("Failed to fetch product information");
      }

      if (!results || results.length === 0) {
        throw new Error("Product not found");
      }

      const product = results[0];

      // Purchase the product
      await InAppPurchases.purchaseItemAsync(productId);
    } catch (error: any) {
      console.error("[StoreScreen] Purchase error:", error);
      Alert.alert(
        "エラー",
        error.message || "購入処理中にエラーが発生しました。",
      );
      setIsPurchasing(false);
      setPurchasingPlan(null);
    }
  };

  const handlePurchaseSuccess = async (purchase: any) => {
    try {
      const currentUserId =
        profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        throw new Error("User ID not found");
      }

      // Determine plan type from product ID
      const planType =
        purchase.productId === PRODUCT_IDS.BASIC ? "basic" : "permanent";
      const price =
        planType === "basic" ? 2000 : 10000;

      // Create membership record
      const result = await membershipService.createMembership(
        currentUserId,
        planType,
        price,
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

      // Acknowledge purchase
      if (purchase.acknowledged === false && InAppPurchases) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
      }
    } catch (error: any) {
      console.error("[StoreScreen] Error processing purchase:", error);
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
          // Process any unacknowledged purchases
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
      console.error("[StoreScreen] Restore error:", error);
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
        {
          text: "キャンセル",
          style: "cancel",
        },
        {
          text: "キャンセルする",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUserId =
                profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
              if (!currentUserId) {
                Alert.alert("エラー", "ユーザーIDが見つかりません。");
                return;
              }

              const result = await membershipService.cancelMembership(
                currentUserId,
              );

              if (result.success) {
                Alert.alert(
                  "キャンセル完了",
                  "メンバーシップがキャンセルされました。",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        loadMembershipInfo();
                      },
                    },
                  ],
                );
              } else {
                Alert.alert("エラー", result.error || "キャンセルに失敗しました。");
              }
            } catch (error: any) {
              console.error("[StoreScreen] Cancel error:", error);
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="STORE_SCREEN.BACK_BUTTON"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ストア</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Expo Go Warning */}
        {isExpoGo && (
          <View style={styles.expoGoWarning}>
            <Ionicons name="information-circle" size={20} color={Colors.warning} />
            <Text style={styles.expoGoWarningText}>
              In-App Purchasesは開発ビルドでのみ利用可能です。Expo Goでは機能をテストできません。
            </Text>
          </View>
        )}
        
        {/* Current Membership Status */}
        {membership && membership.is_active ? (
          <View style={styles.membershipStatusCard}>
            <View style={styles.membershipStatusHeader}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.membershipStatusTitle}>現在のメンバーシップ</Text>
            </View>
            <Text style={styles.membershipStatusText}>
              {membership.plan_type === "basic" ? "ベーシックプラン" : "永久プラン"}
            </Text>
            {membership.expiration_date && (
              <Text style={styles.membershipStatusDate}>
                有効期限: {formatDate(membership.expiration_date)}
              </Text>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelMembership}
              testID="STORE_SCREEN.CANCEL_MEMBERSHIP_BUTTON"
            >
              <Text style={styles.cancelButtonText}>メンバーシップをキャンセル</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noMembershipCard}>
            <Text style={styles.noMembershipText}>
              メンバーシップに加入すると、メッセージの送信が可能になります。
            </Text>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          {/* Basic Plan */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>ベーシックプラン</Text>
              <Text style={styles.planPrice}>¥2,000</Text>
            </View>
            <Text style={styles.planDescription}>
              メッセージのやり取りが可能になります
            </Text>
            <Text style={styles.planPeriod}>月額</Text>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                membership?.is_active && membership.plan_type === "basic" &&
                  styles.purchaseButtonActive,
                isPurchasing && purchasingPlan === "basic" && styles.purchaseButtonDisabled,
              ]}
              onPress={() => handlePurchase("basic")}
              disabled={isPurchasing || (membership?.is_active && membership.plan_type === "basic")}
              testID="STORE_SCREEN.BASIC_PLAN_BUTTON"
            >
              {isPurchasing && purchasingPlan === "basic" ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {membership?.is_active && membership.plan_type === "basic"
                    ? "現在のプラン"
                    : "購入する"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Permanent Plan */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>永久プラン</Text>
              <Text style={styles.planPrice}>¥10,000</Text>
            </View>
            <Text style={styles.planDescription}>
              永久にメッセージのやり取りが可能になります
            </Text>
            <Text style={styles.planPeriod}>一回限り</Text>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                membership?.is_active && membership.plan_type === "permanent" &&
                  styles.purchaseButtonActive,
                isPurchasing && purchasingPlan === "permanent" && styles.purchaseButtonDisabled,
              ]}
              onPress={() => handlePurchase("permanent")}
              disabled={isPurchasing || (membership?.is_active && membership.plan_type === "permanent")}
              testID="STORE_SCREEN.PERMANENT_PLAN_BUTTON"
            >
              {isPurchasing && purchasingPlan === "permanent" ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {membership?.is_active && membership.plan_type === "permanent"
                    ? "現在のプラン"
                    : "購入する"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={isPurchasing}
          testID="STORE_SCREEN.RESTORE_BUTTON"
        >
          <Text style={styles.restoreButtonText}>購入を復元</Text>
        </TouchableOpacity>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsButton}
          onPress={() => {
            // TODO: Navigate to terms screen or open URL
            Alert.alert("利用規約", "利用規約へのリンクを実装してください。");
          }}
        >
          <Text style={styles.termsButtonText}>プライバシーポリシーと利用規約</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>価格はすべて税込です。</Text>
          <Text style={styles.footerText}>
            購入後のお支払いは、{Platform.OS === "ios" ? "iTunes" : "Google Play"}アカウントに請求されます。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
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
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  membershipStatusCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  membershipStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  membershipStatusTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  membershipStatusText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  membershipStatusDate: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
    textAlign: "center",
  },
  noMembershipCard: {
    backgroundColor: Colors.gray[50],
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noMembershipText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  plansContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  planTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  planPrice: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.primary,
  },
  planDescription: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  planPeriod: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseButtonActive: {
    backgroundColor: Colors.gray[400],
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  restoreButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  restoreButtonText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  termsButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  termsButtonText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.info,
    textDecorationLine: "underline",
  },
  footer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  expoGoWarning: {
    backgroundColor: Colors.warning + "20",
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warning + "40",
  },
  expoGoWarningText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    lineHeight: 20,
  },
});

export default StoreScreen;

