import React, { useState, useEffect, useCallback } from "react";
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
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useRevenueCat } from "../contexts/RevenueCatContext";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { revenueCatService, ENTITLEMENT_ID } from "../services/revenueCatService";
import { PurchasesPackage } from "react-native-purchases";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width } = Dimensions.get("window");

type StoreScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<StoreScreenNavigationProp>();
  const { profileId } = useAuth();
  const {
    isInitialized,
    isProMember,
    currentOffering,
    expirationDate,
    willRenew,
    refreshCustomerInfo,
  } = useRevenueCat();

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    // Set loading based on RevenueCat initialization
    setIsLoading(!isInitialized);
  }, [isInitialized]);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get price from current offering
  const getSubscriptionPrice = useCallback((): string => {
    if (currentOffering && currentOffering.monthly) {
      return currentOffering.monthly.product.priceString;
    }
    // Fallback price if offering not loaded
    return "¥2,000";
  }, [currentOffering]);

  // Present RevenueCat Paywall
  const handlePresentPaywall = async () => {
    if (!isInitialized) {
      Alert.alert("エラー", "ストアの初期化中です。しばらくお待ちください。");
      return;
    }

    if (!profileId) {
      Alert.alert("エラー", "ログインが必要です。");
      return;
    }

    try {
      setIsPurchasing(true);

      // Present the RevenueCat paywall
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });

      console.log("[StoreScreen] Paywall result:", paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
          // Refresh customer info to update state
          await refreshCustomerInfo();
          Alert.alert(
            "購入完了",
            "メンバーシップが有効になりました。メッセージの送信が可能になりました。",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
          break;
        case PAYWALL_RESULT.RESTORED:
          await refreshCustomerInfo();
          Alert.alert("復元完了", "購入が復元されました。", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          break;
        case PAYWALL_RESULT.NOT_PRESENTED:
          // User already has the entitlement
          Alert.alert("情報", "すでにメンバーシップが有効です。");
          break;
        case PAYWALL_RESULT.ERROR:
          Alert.alert("エラー", "購入処理中にエラーが発生しました。");
          break;
        case PAYWALL_RESULT.CANCELLED:
          // User cancelled - no alert needed
          console.log("[StoreScreen] Paywall cancelled by user");
          break;
      }
    } catch (error: any) {
      console.error("[StoreScreen] Paywall error:", error);
      Alert.alert("エラー", "購入処理中にエラーが発生しました。");
    } finally {
      setIsPurchasing(false);
    }
  };

  // Manual purchase without paywall UI (fallback)
  const handleManualPurchase = async () => {
    if (!isInitialized || !currentOffering) {
      Alert.alert("エラー", "商品情報を読み込めませんでした。");
      return;
    }

    if (!profileId) {
      Alert.alert("エラー", "ログインが必要です。");
      return;
    }

    const monthlyPackage = currentOffering.monthly;
    if (!monthlyPackage) {
      Alert.alert("エラー", "サブスクリプションプランが見つかりません。");
      return;
    }

    try {
      setIsPurchasing(true);
      const result = await revenueCatService.purchasePackage(monthlyPackage);

      if (result.success) {
        await refreshCustomerInfo();
        Alert.alert(
          "購入完了",
          "メンバーシップが有効になりました。メッセージの送信が可能になりました。",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else if (result.error === "cancelled") {
        // User cancelled - no alert
      } else {
        Alert.alert("エラー", result.error || "購入に失敗しました。");
      }
    } catch (error: any) {
      console.error("[StoreScreen] Purchase error:", error);
      Alert.alert("エラー", "購入処理中にエラーが発生しました。");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsPurchasing(true);
      const result = await revenueCatService.restorePurchases();

      if (result.success) {
        await refreshCustomerInfo();
        // Check if user now has entitlement
        const hasEntitlement = await revenueCatService.checkProEntitlement();
        if (hasEntitlement) {
          Alert.alert("復元完了", "購入が復元されました。");
        } else {
          Alert.alert("情報", "復元できる購入がありません。");
        }
      } else {
        Alert.alert("エラー", result.error || "復元に失敗しました。");
      }
    } catch (error: any) {
      console.error("[StoreScreen] Restore error:", error);
      Alert.alert("エラー", "復元処理中にエラーが発生しました。");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const managementURL = await revenueCatService.getManagementURL();
      if (managementURL) {
        await Linking.openURL(managementURL);
      } else {
        // Fallback to platform-specific subscription management
        if (Platform.OS === "ios") {
          await Linking.openURL("https://apps.apple.com/account/subscriptions");
        } else {
          await Linking.openURL(
            "https://play.google.com/store/account/subscriptions"
          );
        }
      }
    } catch (error: any) {
      console.error("[StoreScreen] Management URL error:", error);
      Alert.alert(
        "サブスクリプション管理",
        Platform.OS === "ios"
          ? "設定アプリ → Apple ID → サブスクリプション からサブスクリプションを管理できます。"
          : "Google Play ストア → メニュー → 定期購入 からサブスクリプションを管理できます。"
      );
    }
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
          {/* Membership Card */}
          <View style={styles.membershipCard}>
            {isProMember ? (
              <>
                {/* Active Membership */}
                <View style={styles.activeStatusBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.activeStatusText}>メンバーシップ有効</Text>
                </View>

                <Text style={styles.cardTitle}>Golfmatch Pro</Text>
                <Text style={styles.cardDescription}>
                  メッセージ機能をご利用いただけます
                </Text>

                {expirationDate && (
                  <View style={styles.expirationInfo}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.text.secondary} />
                    <Text style={styles.expirationText}>
                      {willRenew ? "次回更新日" : "有効期限"}: {formatDate(expirationDate)}
                    </Text>
                  </View>
                )}

                {willRenew && (
                  <View style={styles.renewalInfo}>
                    <Ionicons name="refresh" size={16} color={Colors.success} />
                    <Text style={styles.renewalText}>自動更新: 有効</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={handleManageSubscription}
                >
                  <Text style={styles.manageButtonText}>サブスクリプションを管理</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* No Membership - Show Purchase Option */}
                <View style={styles.crownIcon}>
                  <Ionicons name="diamond" size={48} color={Colors.primary} />
                </View>

                <Text style={styles.cardTitle}>Golfmatch Pro</Text>
                <Text style={styles.cardDescription}>
                  メンバーシップに加入すると、{"\n"}
                  メッセージの送信が可能になります
                </Text>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>月額</Text>
                  <Text style={styles.price}>{getSubscriptionPrice()}</Text>
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
                  onPress={handlePresentPaywall}
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
              Linking.openURL("https://golfmatch.jp/privacy");
            }}
          >
            <Text style={styles.termsButtonText}>プライバシーポリシーと利用規約</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>価格はすべて税込です。</Text>
            <Text style={styles.footerText}>
              サブスクリプションは{Platform.OS === "ios" ? "iTunes" : "Google Play"}
              アカウントに請求されます。
            </Text>
            <Text style={styles.footerText}>
              購読期間終了の24時間前までにキャンセルしない限り、自動更新されます。
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
    marginBottom: Spacing.sm,
  },
  expirationText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  renewalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  renewalText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.success,
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
  manageButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  manageButtonText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
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
