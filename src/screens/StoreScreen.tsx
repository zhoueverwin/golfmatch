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
import { Membership, User } from "../types/dataModels";
import { supabase } from "../services/supabase";
import StandardHeader from "../components/StandardHeader";

type StoreScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Product IDs - these must match what's configured in App Store Connect / Google Play Console
// IMPORTANT: Product IDs must be created in App Store Connect for iOS
// For sandbox testing:
// 1. Go to App Store Connect > My Apps > Your App > In-App Purchases
// 2. Create products with these exact IDs
// 3. Submit for review (can test in sandbox before approval)
const PRODUCT_IDS = {
  BASIC: Platform.OS === "ios" ? "com.zhoueverwin.golfmatchapp.basic" : "basic_plan",
  PERMANENT: Platform.OS === "ios" ? "com.zhoueverwin.golfmatchapp.permanent" : "permanent_plan",
};

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<StoreScreenNavigationProp>();
  const { profileId } = useAuth();
  const insets = useSafeAreaInsets();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState<"basic" | "permanent" | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userGender, setUserGender] = useState<User["gender"] | null>(null);
  const [isFemaleUser, setIsFemaleUser] = useState(false);
  
  // Ensure all insets are valid numbers (prevent NaN)
  const safeTop = Number.isFinite(insets.top) ? insets.top : 0;
  const safeBottom = Number.isFinite(insets.bottom) ? insets.bottom : 0;
  const safeLeft = Number.isFinite(insets.left) ? insets.left : 0;
  const safeRight = Number.isFinite(insets.right) ? insets.right : 0;

  useEffect(() => {
    loadUserGender();
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
        setPurchasingPlan(null);
      },
    );

      return () => {
        subscription.remove();
      };
    }
  }, []);

  const initializeIAP = async () => {
    console.log("[StoreScreen] 🔍 Starting IAP initialization...");
    console.log("[StoreScreen] - isExpoGo:", isExpoGo);
    console.log("[StoreScreen] - InAppPurchases available:", !!InAppPurchases);
    console.log("[StoreScreen] - Platform:", Platform.OS);
    
    if (isExpoGo || !InAppPurchases) {
      console.warn("[StoreScreen] IAP not available in Expo Go");
      return;
    }
    
    // Prevent duplicate connections
    if (isConnected) {
      console.log("[StoreScreen] IAP already connected");
      return;
    }
    
    try {
      console.log("[StoreScreen] 📡 Calling InAppPurchases.connectAsync()...");
      const connected = await InAppPurchases.connectAsync();
      console.log("[StoreScreen] 📡 connectAsync() returned:", connected);
      console.log("[StoreScreen] 📡 connectAsync() type:", typeof connected);
      
      // Handle undefined as potentially already connected
      if (connected === undefined) {
        console.log("[StoreScreen] ⚠️  connectAsync returned undefined");
        console.log("[StoreScreen] 🔍 This might mean IAP is already connected or in indeterminate state");
        console.log("[StoreScreen] 🎯 Will attempt to proceed with purchase anyway...");
        // Treat undefined as connected and try to use it
        setIsConnected(true);
      } else if (connected === true) {
        console.log("[StoreScreen] ✅ Successfully connected to IAP");
        setIsConnected(true);
      } else if (connected === false) {
        console.error("[StoreScreen] ❌ Failed to connect to IAP - StoreKit connection failed");
        console.error("[StoreScreen] 🔧 Troubleshooting steps:");
        console.error("[StoreScreen]    1. Ensure device is signed out of Media & Purchases");
        console.error("[StoreScreen]    2. Check internet connection");
        console.error("[StoreScreen]    3. Verify bundle ID matches App Store Connect");
        console.error("[StoreScreen]    4. Check device restrictions (Settings → Screen Time)");
        Alert.alert(
          "接続エラー",
          "App Storeに接続できませんでした。\n\n" +
          "確認事項:\n" +
          "1. 設定 → [名前] → メディアと購入 → サインアウト\n" +
          "2. インターネット接続を確認\n" +
          "3. デバイスの制限設定を確認",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error("[StoreScreen] ❌ Exception during IAP initialization:", error);
      console.error("[StoreScreen] - Error code:", error?.code);
      console.error("[StoreScreen] - Error message:", error?.message);
      console.error("[StoreScreen] - Full error:", JSON.stringify(error, null, 2));
      
      // Handle "Already connected" error gracefully
      if (error?.code === "ERR_IN_APP_PURCHASES_CONNECTION" || 
          error?.message?.includes("Already connected")) {
        console.log("[StoreScreen] ✅ IAP already connected (handled)");
        setIsConnected(true);
      } else {
        console.error("[StoreScreen] ❌ Unhandled IAP error");
        Alert.alert(
          "初期化エラー",
          "In-App Purchaseの初期化に失敗しました。\n\n" +
          `エラー: ${error?.message || "不明なエラー"}`,
          [{ text: "OK" }]
        );
      }
    }
  };

  const loadUserGender = async () => {
    try {
      const currentUserId =
        profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!currentUserId) {
        return;
      }

      // Try to find profile by multiple possible ID fields
      const { data, error } = await supabase
        .from("profiles")
        .select("gender")
        .or(`id.eq.${currentUserId},legacy_id.eq.${currentUserId},user_id.eq.${currentUserId}`)
        .maybeSingle();

      if (!error && data) {
        const gender = data.gender as User["gender"] | null;
        setUserGender(gender);
        setIsFemaleUser(gender === "female");
      }
    } catch (error) {
      console.error("[StoreScreen] Error loading user gender:", error);
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
    console.log("\n========================================");
    console.log("🛒 [StoreScreen] PURCHASE FLOW STARTED");
    console.log("========================================");
    console.log("Plan Type:", planType);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Platform:", Platform.OS);
    console.log("isExpoGo:", isExpoGo);
    console.log("InAppPurchases available:", !!InAppPurchases);
    console.log("IAP Connected:", isConnected);
    
    if (isExpoGo || !InAppPurchases) {
      console.error("❌ InAppPurchases not available");
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
      console.error("❌ No user profile ID");
      Alert.alert("エラー", "ログインが必要です。");
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchasingPlan(planType);

      const productId =
        planType === "basic" ? PRODUCT_IDS.BASIC : PRODUCT_IDS.PERMANENT;

      console.log("\n📋 Product ID Configuration:");
      console.log("  BASIC ID:", PRODUCT_IDS.BASIC);
      console.log("  PERMANENT ID:", PRODUCT_IDS.PERMANENT);
      console.log("  Requesting:", productId);
      console.log("  Bundle ID (expected): com.zhoueverwin.golfmatchapp");

      console.log("\n📡 Calling getProductsAsync...");
      const startTime = Date.now();
      
      // Check if product is available
      const { responseCode, results } = await InAppPurchases.getProductsAsync([
        productId,
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("\n✅ getProductsAsync completed");
      console.log("  Duration:", duration, "ms");
      console.log("  Response Code (raw):", responseCode);
      console.log("  IAP Response Codes Reference:");
      console.log("    - OK =", InAppPurchases.IAPResponseCode.OK);
      console.log("    - ERROR =", InAppPurchases.IAPResponseCode.ERROR);
      console.log("    - DEFERRED =", InAppPurchases.IAPResponseCode.DEFERRED);
      console.log("  Response Code Name:", 
        responseCode === InAppPurchases.IAPResponseCode.OK ? "OK ✅" :
        responseCode === InAppPurchases.IAPResponseCode.ERROR ? "ERROR ❌" :
        responseCode === InAppPurchases.IAPResponseCode.DEFERRED ? "DEFERRED ⏳" :
        responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED ? "USER_CANCELED 🚫" :
        "UNKNOWN ⚠️"
      );
      console.log("  Results Count:", results?.length || 0);
      
      if (results && results.length > 0) {
        console.log("\n📦 Product Details:");
        results.forEach((product, index) => {
          console.log(`  Product ${index + 1}:`);
          console.log("    Product ID:", product.productId);
          console.log("    Title:", product.title);
          console.log("    Description:", product.description);
          console.log("    Price:", product.price);
          console.log("    Price String:", product.priceString);
          console.log("    Type:", product.type);
        });
      } else {
        console.log("\n❌ No products returned");
      }
      
      console.log("\n🔍 Full Response Object:");
      console.log(JSON.stringify({ responseCode, results }, null, 2));

      if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
        console.error("\n❌ Response Code NOT OK");
        console.error("  Code:", responseCode);
        console.error("  Expected:", InAppPurchases.IAPResponseCode.OK);
        
        // Provide user-friendly error message
        let errorMessage = "商品情報の取得に失敗しました。";
        if (responseCode === InAppPurchases.IAPResponseCode.ERROR) {
          errorMessage = "ストアに接続できませんでした。ネットワーク接続を確認してください。";
          console.error("  Reason: Cannot connect to App Store");
        } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
          errorMessage = "購入が保留中です。しばらくお待ちください。";
          console.error("  Reason: Purchase deferred");
        }
        
        console.error("\n🔧 Troubleshooting:");
        console.error("  1. Device signed out of Media & Purchases?");
        console.error("  2. Internet connection working?");
        console.error("  3. Apple sandbox servers operational?");
        
        Alert.alert("エラー", errorMessage);
        setIsPurchasing(false);
        setPurchasingPlan(null);
        return;
      }

      if (!results || results.length === 0) {
        console.error("\n❌❌❌ PRODUCT NOT FOUND ❌❌❌");
        console.error("  Requested Product ID:", productId);
        console.error("  Bundle ID: com.zhoueverwin.golfmatchapp");
        console.error("  Platform:", Platform.OS);
        console.error("  Response Code:", responseCode, "(OK)");
        console.error("  Results:", results);
        
        console.error("\n🔍 Possible Issues:");
        console.error("  1. Product not created in App Store Connect");
        console.error("  2. Product ID mismatch (case-sensitive!)");
        console.error("  3. Product not in 'Ready to Submit' or 'Approved' status");
        console.error("  4. Products not synced yet (wait 1 hour after creation)");
        console.error("  5. TestFlight: Products not linked to app version");
        console.error("  6. Paid Apps Agreement not signed");
        console.error("  7. Banking/tax info not configured");
        
        console.error("\n📝 Action Items:");
        console.error("  → Check App Store Connect → In-App Purchases");
        console.error("  → Verify product ID exactly: " + productId);
        console.error("  → Check product status");
        console.error("  → If TestFlight: Link products to app version");
        
        Alert.alert(
          "商品が見つかりません",
          `この商品は現在ご利用いただけません。\n\n` +
          `商品ID: ${productId}\n\n` +
          `App Store Connectで以下を確認してください:\n` +
          `1. 商品が作成されていること\n` +
          `2. 商品IDが正確に一致すること (大文字小文字も)\n` +
          `3. 商品が「Ready to Submit」または「Approved」状態\n` +
          `4. 契約と税金の設定が完了していること\n` +
          `5. TestFlight: 商品がアプリバージョンにリンクされていること`,
        );
        setIsPurchasing(false);
        setPurchasingPlan(null);
        return;
      }

      const product = results[0];
      
      console.log("\n✅ Product found! Proceeding to purchase...");
      console.log("  Product ID:", product.productId);
      console.log("  Title:", product.title);
      console.log("  Price:", product.priceString);

      console.log("\n🛒 Calling purchaseItemAsync...");
      const purchaseStartTime = Date.now();
      
      // Purchase the product
      await InAppPurchases.purchaseItemAsync(productId);
      
      const purchaseEndTime = Date.now();
      console.log("✅ purchaseItemAsync completed in", purchaseEndTime - purchaseStartTime, "ms");
      
    } catch (error: any) {
      console.error("\n❌❌❌ EXCEPTION DURING PURCHASE ❌❌❌");
      console.error("Error object:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      console.error("Error name:", error?.name);
      console.error("Full error JSON:", JSON.stringify(error, null, 2));
      
      // Provide user-friendly error messages
      let errorMessage = "購入処理中にエラーが発生しました。";
      
      if (error?.message) {
        const lowerMessage = error.message.toLowerCase();
        console.error("\nParsing error message:", error.message);
        
        if (lowerMessage.includes("product not found")) {
          errorMessage = "商品が見つかりません。App Store Connectで商品設定を確認してください。";
          console.error("  → Issue: Product not found");
        } else if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
          errorMessage = "ネットワークエラーが発生しました。接続を確認して再度お試しください。";
          console.error("  → Issue: Network/Connection error");
        } else if (lowerMessage.includes("user canceled") || lowerMessage.includes("cancel")) {
          // User canceled - don't show error
          console.log("  → User canceled purchase (expected behavior)");
          setIsPurchasing(false);
          setPurchasingPlan(null);
          return;
        } else {
          // Generic error - don't expose technical details
          errorMessage = "購入処理中に問題が発生しました。しばらく時間をおいて再度お試しください。";
          console.error("  → Issue: Unknown error");
        }
      }
      
      console.error("========================================");
      console.error("END OF PURCHASE ERROR LOG");
      console.error("========================================\n");
      
      Alert.alert("エラー", errorMessage + "\n\n詳細はXcodeコンソールを確認してください。");
      setIsPurchasing(false);
      setPurchasingPlan(null);
    }
  };

  const handlePurchaseSuccess = async (purchase: any) => {
    console.log("\n========================================");
    console.log("🎉 [StoreScreen] PURCHASE SUCCESS");
    console.log("========================================");
    console.log("Purchase object:", JSON.stringify(purchase, null, 2));
    
    try {
      const currentUserId =
        profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      
      console.log("Current User ID:", currentUserId);
      
      if (!currentUserId) {
        console.error("❌ No user ID found");
        throw new Error("User ID not found");
      }

      // Determine plan type from product ID
      const planType =
        purchase.productId === PRODUCT_IDS.BASIC ? "basic" : "permanent";
      const price =
        planType === "basic" ? 2000 : 10000;
      
      console.log("Plan Type:", planType);
      console.log("Price:", price);
      console.log("Transaction ID:", purchase.orderId || purchase.transactionId);
      console.log("Platform:", Platform.OS);

      console.log("\n📝 Creating membership record...");
      // Create membership record
      const result = await membershipService.createMembership(
        currentUserId,
        planType,
        price,
        purchase.orderId || purchase.transactionId || "",
        Platform.OS as "ios" | "android",
      );

      console.log("Membership creation result:", result);

      if (result.success) {
        console.log("✅ Membership created successfully");
        
        Alert.alert(
          "購入完了",
          "メンバーシップが有効になりました。メッセージの送信が可能になりました。",
          [
            {
              text: "OK",
              onPress: () => {
                console.log("Reloading membership info and navigating back...");
                loadMembershipInfo();
                navigation.goBack();
              },
            },
          ],
        );
      } else {
        console.error("❌ Failed to create membership:", result.error);
        throw new Error(result.error || "Failed to create membership");
      }

      // Acknowledge purchase
      if (purchase.acknowledged === false && InAppPurchases) {
        console.log("📝 Finishing transaction...");
        await InAppPurchases.finishTransactionAsync(purchase, true);
        console.log("✅ Transaction finished");
      } else {
        console.log("ℹ️  Transaction already acknowledged or IAP not available");
      }
      
      console.log("========================================");
      console.log("END OF PURCHASE SUCCESS HANDLER");
      console.log("========================================\n");
      
    } catch (error: any) {
      console.error("\n❌❌❌ ERROR PROCESSING PURCHASE ❌❌❌");
      console.error("Error:", error);
      console.error("Error message:", error?.message);
      console.error("Full error:", JSON.stringify(error, null, 2));
      console.error("========================================\n");
      
      Alert.alert("エラー", "購入の処理中にエラーが発生しました。\n\n詳細はXcodeコンソールを確認してください。");
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
      <StandardHeader
        title="ストア"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

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
        
        {/* Free Access Badge for Female Users */}
        {isFemaleUser && (
          <View style={styles.freeAccessCard}>
            <View style={styles.freeAccessHeader}>
              <Ionicons name="heart" size={24} color={Colors.success} />
              <View style={styles.freeAccessBadge}>
                <Text style={styles.freeAccessBadgeText}>女性ユーザー無料</Text>
              </View>
            </View>
            <Text style={styles.freeAccessTitle}>無料アクセス</Text>
            <Text style={styles.freeAccessMessage}>
              女性ユーザーは無料でメッセージ機能をご利用いただけます。他のユーザーと積極的に交流しましょう！
            </Text>
            <View style={styles.freeAccessFeatures}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.freeAccessFeatureText}>メッセージの送受信</Text>
            </View>
            <View style={styles.freeAccessFeatures}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.freeAccessFeatureText}>制限なしでご利用可能</Text>
            </View>
          </View>
        )}
        
        {/* Current Membership Status - Only show for non-female users */}
        {!isFemaleUser && membership && membership.is_active ? (
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
        ) : !isFemaleUser ? (
          <View style={styles.noMembershipCard}>
            <Text style={styles.noMembershipText}>
              メンバーシップに加入すると、メッセージの送信が可能になります。
            </Text>
          </View>
        ) : null}

        {/* Plans - Hide for female users */}
        {!isFemaleUser && (
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
        )}

        {/* Restore Purchases - Hide for female users */}
        {!isFemaleUser && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isPurchasing}
            testID="STORE_SCREEN.RESTORE_BUTTON"
          >
            <Text style={styles.restoreButtonText}>購入を復元</Text>
          </TouchableOpacity>
        )}

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

        {/* Footer - Hide pricing info for female users */}
        {!isFemaleUser && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>価格はすべて税込です。</Text>
            <Text style={styles.footerText}>
              購入後のお支払いは、{Platform.OS === "ios" ? "iTunes" : "Google Play"}アカウントに請求されます。
            </Text>
          </View>
        )}
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
  freeAccessCard: {
    backgroundColor: Colors.success + "15",
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.success,
    ...Shadows.medium,
  },
  freeAccessHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  freeAccessBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  freeAccessBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  freeAccessTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  freeAccessMessage: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  freeAccessFeatures: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  freeAccessFeatureText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
});

export default StoreScreen;
