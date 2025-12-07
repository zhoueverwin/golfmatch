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
import { BlurView } from "expo-blur";
import MaskedView from "@react-native-masked-view/masked-view";
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
import { supabase } from "../services/supabase";
import { useQueryClient } from "@tanstack/react-query";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width } = Dimensions.get("window");

type StoreScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<StoreScreenNavigationProp>();
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
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
    return "¥3,000";
  }, [currentOffering]);

  // Helper function to sync premium status directly to database
  // This is a fallback because RevenueCat may be logged in as anonymous user
  const syncPremiumStatusDirectly = useCallback(async (transactionId?: string | null) => {
    if (!profileId) {
      console.log("[StoreScreen] syncPremiumStatusDirectly: No profileId, skipping");
      return;
    }

    console.log("[StoreScreen] Directly syncing premium status to database for profileId:", profileId);
    try {
      // Update profiles.is_premium
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("id", profileId);

      if (profileError) {
        console.error("[StoreScreen] Error updating profile premium status:", profileError);
      } else {
        console.log("[StoreScreen] Successfully updated profile.is_premium to true");
      }

      // Check if user already has an active membership
      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", profileId)
        .eq("is_active", true)
        .maybeSingle();

      if (!existingMembership) {
        // Create new membership record
        const { error: membershipError } = await supabase
          .from("memberships")
          .insert({
            user_id: profileId,
            plan_type: "basic",
            price: 3000,
            purchase_date: new Date().toISOString(),
            expiration_date: null, // Will be updated by RevenueCat webhook if available
            is_active: true,
            store_transaction_id: transactionId || null,
            platform: Platform.OS as "ios" | "android",
          });

        if (membershipError) {
          console.error("[StoreScreen] Error creating membership record:", membershipError);
        } else {
          console.log("[StoreScreen] Successfully created membership record");
        }
      } else {
        console.log("[StoreScreen] User already has active membership, skipping creation");
      }

      // Invalidate React Query cache to refresh profile data with new premium status
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      console.log("[StoreScreen] Invalidated query cache");
    } catch (syncError) {
      console.error("[StoreScreen] Error syncing premium status:", syncError);
    }
  }, [profileId, queryClient]);

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

    console.log("[StoreScreen] Starting paywall presentation...");
    console.log("[StoreScreen] Current offering:", currentOffering);
    console.log("[StoreScreen] Entitlement ID:", ENTITLEMENT_ID);

    try {
      setIsPurchasing(true);

      // Present the RevenueCat paywall
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });

      console.log("[StoreScreen] Paywall result:", paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
          // Directly sync premium status to database (fallback for anonymous RevenueCat user)
          await syncPremiumStatusDirectly();
          // Also try to refresh customer info through RevenueCat
          await refreshCustomerInfo();
          Alert.alert(
            "購入完了",
            "メンバーシップが有効になりました。メッセージの送信が可能になりました。",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
          break;
        case PAYWALL_RESULT.RESTORED:
          // Directly sync premium status to database (fallback for anonymous RevenueCat user)
          await syncPremiumStatusDirectly();
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

    // Check if user already has active membership
    // 1. Check RevenueCat context state
    console.log("[StoreScreen] isProMember from context:", isProMember);

    // 2. Fresh check from RevenueCat API
    const hasEntitlement = await revenueCatService.checkProEntitlement();
    console.log("[StoreScreen] Fresh entitlement check:", hasEntitlement);

    // 3. Fallback: check database is_premium status
    let dbIsPremium = false;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", profileId)
        .single();
      dbIsPremium = data?.is_premium ?? false;
      console.log("[StoreScreen] Database is_premium:", dbIsPremium);
    } catch (err) {
      console.log("[StoreScreen] Failed to check database premium status");
    }

    if (isProMember || hasEntitlement || dbIsPremium) {
      Alert.alert(
        "メンバーシップ有効",
        "すでにメンバーシップが有効です。"
      );
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
        console.log("[StoreScreen] Purchase successful, customerInfo:", JSON.stringify(result.customerInfo?.entitlements?.active, null, 2));

        // Directly sync premium status to database (fallback for anonymous RevenueCat user)
        await syncPremiumStatusDirectly(result.customerInfo?.originalAppUserId);

        // Also try to refresh customer info through RevenueCat (may not work if anonymous)
        await refreshCustomerInfo();

        // Log the entitlement status after refresh
        const hasEntitlement = await revenueCatService.checkProEntitlement();
        console.log("[StoreScreen] After refresh, hasEntitlement:", hasEntitlement);

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
          // Directly sync premium status to database (fallback for anonymous RevenueCat user)
          await syncPremiumStatusDirectly(result.customerInfo?.originalAppUserId);
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
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#15D9D3", "#A2F4F1", "#FFFFFF"]}
        locations={[0, 0.3, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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

        {/* Scrollable Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Background Illustration Wave */}
          <Image
            source={require("../../assets/images/paymentpageassets/Illustration-Background.png")}
            style={styles.backgroundWave}
            resizeMode="cover"
          />

          {/* Diamond Icon */}
          <View style={styles.diamondIconContainer}>
            <Image
              source={require("../../assets/images/paymentpageassets/Diamond-Final.png")}
              style={[styles.diamondIcon, { opacity: 0.95 }]}
              resizeMode="contain"
            />
          </View>

          {/* Membership Title */}
          <Text style={styles.membershipTitle}>メンバーシップ</Text>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../../assets/images/paymentpageassets/Illustration-FINAL.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              メンバーシップでメッセージ機能が解放されます。気になる相手と、今すぐつながりましょう！
            </Text>
          </View>

          {/* White Card with Price and Features */}
          <View style={styles.whiteCard}>
            {/* Price with Gradient Text */}
            <View style={styles.priceSection}>
              <MaskedView
                maskElement={
                  <View style={styles.priceMaskContainer}>
                    <Text style={styles.priceAmount}>¥3,000</Text>
                    <Text style={styles.priceUnit}>/ 月</Text>
                  </View>
                }
              >
                <LinearGradient
                  colors={["#00FFF6", "#2A9D99"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.priceGradient}
                >
                  <View style={styles.priceMaskContainer}>
                    <Text style={[styles.priceAmount, { opacity: 0 }]}>¥3,000</Text>
                    <Text style={[styles.priceUnit, { opacity: 0 }]}>/ 月</Text>
                  </View>
                </LinearGradient>
              </MaskedView>
            </View>

            {/* Features List */}
            <LinearGradient
              colors={["#F5F7FB", "#FFFFFF"]}
              style={styles.featuresSection}
            >
              <View style={styles.featureRow}>
                <Image
                  source={require("../../assets/images/paymentpageassets/Check.png")}
                  style={styles.checkIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.8}>気になる相手と、今すぐメッセージし放題</Text>
              </View>
              <View style={styles.featureRow}>
                <Image
                  source={require("../../assets/images/paymentpageassets/Check.png")}
                  style={styles.checkIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.8}>マッチした相手との距離が一気に縮まる</Text>
              </View>
              <View style={styles.featureRow}>
                <Image
                  source={require("../../assets/images/paymentpageassets/Check.png")}
                  style={styles.checkIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.8}>会員限定の機能で出会いのチャンスUP</Text>
              </View>
              <View style={styles.featureRow}>
                <Image
                  source={require("../../assets/images/paymentpageassets/Check.png")}
                  style={styles.checkIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.8}>いつでも解約可能・追加料金なしで安心</Text>
              </View>

              {/* Highlight Text */}
              <Text style={styles.highlightText}>
                もっと自由に、もっと楽しく出会える
              </Text>
            </LinearGradient>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              月額プランは¥3,000で、登録すると自動更新されます。
            </Text>
            <Text style={styles.termsText}>
              料金は購入時にApple IDアカウントに請求されます。
            </Text>
            <Text style={styles.termsText}>
              更新時には、現在の料金が自動的に請求されます。
            </Text>
            <Text style={styles.termsText}>
              解約はいつでも可能で、追加料金は一切かかりません。
            </Text>
            <Text style={styles.termsText}>
              購入の復元は「購入を復元」から行えます。
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "解約方法",
                  Platform.OS === "ios"
                    ? "【iOSでの解約手順】\n\n1. 端末の「設定」アプリを開く\n2. 「Apple ID」（一番上の名前）をタップ\n3. 「サブスクリプション」を選択\n4. 「GolfMatch」を選択\n5. 「サブスクリプションをキャンセル」をタップ\n\n※解約後も、現在の請求期間が終了するまでは機能を利用できます。"
                    : "【Androidでの解約手順】\n\n1. Google Play ストアを開く\n2. メニューから「定期購入」を選択\n3. 「GolfMatch」を選択\n4. 「定期購入を解約」をタップ\n\n※解約後も、現在の請求期間が終了するまでは機能を利用できます。",
                  [
                    { text: "閉じる", style: "cancel" },
                    {
                      text: "設定を開く",
                      onPress: handleManageSubscription,
                    },
                  ]
                );
              }}
            >
              <Text style={styles.termsLink}>解約方法</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Linking.openURL("https://www.golfmatch.info/?page=privacypolicy-jp");
              }}
            >
              <Text style={styles.termsLink}>プライバシーポリシー</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Linking.openURL("https://www.golfmatch.info/?page=termsofuse-jp");
              }}
            >
              <Text style={styles.termsLink}>利用規約</Text>
            </TouchableOpacity>
          </View>

          {/* Extra padding at bottom for scroll */}
          <View style={{ height: 180 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Fixed Action Buttons at Bottom with Frosted Glass Background */}
      <View style={styles.fixedButtonsContainer}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} style={styles.frostedGlassBackground} tint="light" />
        ) : (
          <View style={styles.frostedGlassBackground} />
        )}
        <TouchableOpacity
          style={[styles.fixedPurchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
          onPress={handleManualPurchase}
          disabled={isPurchasing}
        >
          <LinearGradient
            colors={["#16E4D8", "#20B1AA"]}
            style={styles.purchaseButtonGradient}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.fixedPurchaseButtonText}>購入する</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fixedRestoreButton}
          onPress={handleRestorePurchases}
          disabled={isPurchasing}
        >
          <Text style={styles.fixedRestoreButtonText}>購入を復元</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#22B0A9",
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
    color: Colors.white,
  },
  // Fixed Buttons at Bottom
  fixedButtonsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 19,
    paddingBottom: Platform.OS === "ios" ? 34 : 19,
    backgroundColor: "transparent",
  },
  frostedGlassBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    ...Platform.select({
      ios: {
        // iOS will use the actual blur view if available
      },
      android: {
        backgroundColor: "rgba(255, 255, 255, 0.85)",
      },
    }),
  },
  fixedPurchaseButton: {
    width: 346,
    height: 58,
    borderRadius: 100,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2,
  },
  purchaseButtonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fixedPurchaseButtonText: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#FFFFFF",
    lineHeight: 40,
  },
  fixedRestoreButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    zIndex: 2,
  },
  fixedRestoreButtonText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#20B1AA",
    textDecorationLine: "underline",
    lineHeight: 40,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 50,
  },
  backButton: {
    padding: 4,
    minWidth: 60,
  },
  backContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backIconImage: {
    width: 14,
    height: 14,
    tintColor: "#FFFFFF",
  },
  backLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 54,
  },
  // Scrollable Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    alignItems: "center",
  },
  // Background Wave
  backgroundWave: {
    position: "absolute",
    width: 1090,
    height: 750,
    left: -353,
    top: 204,
    opacity: 0.25,
  },
  // Diamond Icon
  diamondIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: "transparent",
    zIndex: 2,
  },
  diamondIcon: {
    width: 100,
    height: 100,
    backgroundColor: "transparent",
  },
  // Membership Title
  membershipTitle: {
    fontSize: 30,
    fontWeight: "900",
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: -10,
    zIndex: 2,
  },
  
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -60,
    marginBottom: -20,
    width: "100%",
    paddingHorizontal: 15,
    zIndex: 2,
  },
  illustration: {
    width: "100%",
    height: undefined,
    aspectRatio: 213 / 179,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 50,
  },
  // Description Container
  descriptionContainer: {
    paddingHorizontal: 34,
    marginBottom: 20,
    marginTop: -40,
    alignItems: "center",
    zIndex: 2,
  },
  // Description
  description: {
    fontSize: 19,
    fontFamily: Typography.fontFamily.medium,
    color: "#22B0A9",
    textAlign: "center",
    lineHeight: 30,
    maxWidth: 325,
  },
  // White Card
  whiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    width: 346,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 16,
    overflow: "hidden",
    marginBottom: 18,
    zIndex: 2,
  },
  // Price Section
  priceSection: {
    paddingTop: 19,
    paddingBottom: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  priceMaskContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  priceGradient: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: "900",
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#000000",
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#000000",
    marginLeft: 0,
  },
  // Features Section
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 35,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    paddingVertical: 0,
  },
  checkIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: "#686C75",
    lineHeight: 32,
    flex: 1,
  },
  // Highlight Text
  highlightText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#1FB7B2",
    textAlign: "center",
    lineHeight: 26,
    marginTop: 18,
    paddingHorizontal: 10,
  },
  // Terms and Conditions
  termsContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: "#A2F4F1",
    width: "100%",
    marginTop: -20,
  },
  termsText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: "#22B0A9",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  termsLink: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: "#21B2AA",
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 5,
    marginBottom: 0,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
});

export default StoreScreen;
