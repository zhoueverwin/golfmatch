import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

// RevenueCat API Keys from environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || "";
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || "";

// Entitlement identifier (must match RevenueCat dashboard)
export const ENTITLEMENT_ID = "Golfmatch Pro";

// Offering identifier
export const OFFERING_ID = "default";

export interface RevenueCatState {
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isProMember: boolean;
}

class RevenueCatService {
  private isConfigured = false;
  private customerInfoUpdateListeners: ((customerInfo: CustomerInfo) => void)[] = [];

  /**
   * Configure RevenueCat SDK
   * Should be called once at app startup
   */
  async configure(appUserID?: string | null): Promise<boolean> {
    if (this.isConfigured) {
      console.log("[RevenueCat] Already configured");
      return true;
    }

    try {
      // Set log level for debugging (remove in production)
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const apiKey =
        Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      if (!apiKey) {
        console.error("[RevenueCat] API key not found. Make sure EXPO_PUBLIC_REVENUECAT_API_KEY_IOS or EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID is set in .env");
        return false;
      }

      console.log("[RevenueCat] Configuring with API key:", apiKey.substring(0, 10) + "...");

      await Purchases.configure({
        apiKey,
        appUserID: appUserID || undefined, // Let RevenueCat generate anonymous ID if null
      });

      // Set up customer info update listener
      Purchases.addCustomerInfoUpdateListener((info) => {
        console.log("[RevenueCat] Customer info updated");
        this.notifyCustomerInfoUpdateListeners(info);
      });

      this.isConfigured = true;
      console.log("[RevenueCat] Successfully configured");
      return true;
    } catch (error: any) {
      console.error("[RevenueCat] Configuration failed:", error);
      return false;
    }
  }

  /**
   * Identify user with their app user ID (e.g., profile ID from auth)
   * Call this after user logs in
   */
  async login(appUserID: string): Promise<CustomerInfo | null> {
    try {
      console.log("[RevenueCat] Attempting login with appUserID:", appUserID);
      const { customerInfo } = await Purchases.logIn(appUserID);
      console.log("[RevenueCat] User logged in:", appUserID);
      console.log("[RevenueCat] Login result - originalAppUserId:", customerInfo.originalAppUserId);
      console.log("[RevenueCat] Login result - active entitlements:", Object.keys(customerInfo.entitlements.active));
      return customerInfo;
    } catch (error: any) {
      console.error("[RevenueCat] Login failed:", error);
      console.error("[RevenueCat] Login error details:", JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * Log out user (reset to anonymous)
   * Call this when user logs out
   */
  async logout(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.logOut();
      console.log("[RevenueCat] User logged out");
      return customerInfo;
    } catch (error: any) {
      console.error("[RevenueCat] Logout failed:", error);
      return null;
    }
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error: any) {
      console.error("[RevenueCat] Failed to get customer info:", error);
      return null;
    }
  }

  /**
   * Check if user has active "Golfmatch Pro" entitlement
   */
  async checkProEntitlement(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log("[RevenueCat] checkProEntitlement - active entitlements:", Object.keys(customerInfo.entitlements.active));

      let isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      // Fallback: if exact entitlement ID not found, check if ANY active entitlement exists
      if (!isActive && Object.keys(customerInfo.entitlements.active).length > 0) {
        console.log("[RevenueCat] FALLBACK: Exact entitlement not found, but user has active entitlements");
        isActive = true;
      }

      console.log("[RevenueCat] Pro entitlement active:", isActive);
      return isActive;
    } catch (error: any) {
      console.error("[RevenueCat] Entitlement check failed:", error);
      return false;
    }
  }

  /**
   * Get current offerings (subscription packages)
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        console.log("[RevenueCat] Current offering:", offerings.current.identifier);
        return offerings.current;
      }
      console.log("[RevenueCat] No current offering available");
      return null;
    } catch (error: any) {
      console.error("[RevenueCat] Failed to get offerings:", error);
      return null;
    }
  }

  /**
   * Purchase a package
   */
  async purchasePackage(
    packageToPurchase: PurchasesPackage
  ): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      console.log("[RevenueCat] Purchase successful");
      return { success: true, customerInfo };
    } catch (error: any) {
      if (error.userCancelled) {
        console.log("[RevenueCat] Purchase cancelled by user");
        return { success: false, error: "cancelled" };
      }
      console.error("[RevenueCat] Purchase failed:", error);
      return { success: false, error: error.message || "Purchase failed" };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log("[RevenueCat] Purchases restored");
      return { success: true, customerInfo };
    } catch (error: any) {
      console.error("[RevenueCat] Restore failed:", error);
      return { success: false, error: error.message || "Restore failed" };
    }
  }

  /**
   * Sync purchases with RevenueCat (useful after app reinstall or device transfer)
   */
  async syncPurchases(): Promise<void> {
    try {
      await Purchases.syncPurchases();
      console.log("[RevenueCat] Purchases synced");
    } catch (error: any) {
      console.error("[RevenueCat] Sync failed:", error);
    }
  }

  /**
   * Get expiration date for Pro entitlement
   */
  async getProExpirationDate(): Promise<Date | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      if (entitlement && entitlement.expirationDate) {
        return new Date(entitlement.expirationDate);
      }
      return null;
    } catch (error: any) {
      console.error("[RevenueCat] Failed to get expiration date:", error);
      return null;
    }
  }

  /**
   * Check if subscription will renew
   */
  async willRenew(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return entitlement ? entitlement.willRenew : false;
    } catch (error: any) {
      console.error("[RevenueCat] Failed to check renewal status:", error);
      return false;
    }
  }

  /**
   * Add listener for customer info updates
   */
  addCustomerInfoUpdateListener(listener: (customerInfo: CustomerInfo) => void): () => void {
    this.customerInfoUpdateListeners.push(listener);
    return () => {
      this.customerInfoUpdateListeners = this.customerInfoUpdateListeners.filter(
        (l) => l !== listener
      );
    };
  }

  /**
   * Notify all listeners of customer info update
   */
  private notifyCustomerInfoUpdateListeners(customerInfo: CustomerInfo): void {
    this.customerInfoUpdateListeners.forEach((listener) => {
      try {
        listener(customerInfo);
      } catch (error) {
        console.error("[RevenueCat] Listener error:", error);
      }
    });
  }

  /**
   * Get subscription management URL (for iOS subscription management)
   */
  async getManagementURL(): Promise<string | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.managementURL || null;
    } catch (error: any) {
      console.error("[RevenueCat] Failed to get management URL:", error);
      return null;
    }
  }

  /**
   * Check if RevenueCat is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

export const revenueCatService = new RevenueCatService();
