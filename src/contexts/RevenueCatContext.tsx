import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { revenueCatService, ENTITLEMENT_ID } from "../services/revenueCatService";
import { useAuth } from "./AuthContext";
import { supabase } from "../services/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

interface RevenueCatContextType {
  isInitialized: boolean;
  isProMember: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  expirationDate: Date | null;
  willRenew: boolean;
  refreshCustomerInfo: () => Promise<void>;
  checkEntitlement: () => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
};

interface RevenueCatProviderProps {
  children: React.ReactNode;
}

export const RevenueCatProvider: React.FC<RevenueCatProviderProps> = ({ children }) => {
  const { profileId, user } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isProMember, setIsProMember] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [willRenew, setWillRenew] = useState(false);

  // Track previous user to detect logout (not initial load)
  const previousUserRef = useRef<typeof user>(undefined);
  // Track if we've already logged in for the current profile to prevent repeated calls
  const loggedInProfileRef = useRef<string | null>(null);

  // Sync premium status to database and create/update membership record
  const syncPremiumStatusToDatabase = useCallback(async (isPro: boolean, entitlementInfo?: any) => {
    if (!profileId) return;

    try {
      if (isPro) {
        // User has active subscription - update to premium
        const { error } = await supabase
          .from("profiles")
          .update({ is_premium: true })
          .eq("id", profileId);

        if (error) {
          console.error("[RevenueCatContext] Error syncing premium status to database:", error);
        } else {
          console.log("[RevenueCatContext] Synced premium status to database: true");
        }

        // Create or update membership record
        // First check if user already has an active membership
        const { data: existingMembership } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", profileId)
          .eq("is_active", true)
          .maybeSingle();

        if (!existingMembership) {
          // Create new membership record
          const planType = entitlementInfo?.expirationDate ? "basic" : "permanent";
          const expirationDate = entitlementInfo?.expirationDate || null;

          const { error: membershipError } = await supabase
            .from("memberships")
            .insert({
              user_id: profileId,
              plan_type: planType,
              price: 0, // Price tracked by RevenueCat
              purchase_date: new Date().toISOString(),
              expiration_date: expirationDate,
              is_active: true,
              store_transaction_id: entitlementInfo?.productIdentifier || null,
              platform: Platform.OS as "ios" | "android",
            });

          if (membershipError) {
            console.error("[RevenueCatContext] Error creating membership record:", membershipError);
          } else {
            console.log("[RevenueCatContext] Created membership record for user:", profileId);
          }
        } else {
          console.log("[RevenueCatContext] User already has active membership, skipping creation");
        }
      } else {
        // User subscription expired/cancelled - check for manual override before syncing
        console.log("[RevenueCatContext] No RevenueCat entitlement, checking for permanent membership");

        // Check if user has an active permanent membership (manually granted)
        const { data: permanentMembership } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", profileId)
          .eq("plan_type", "permanent")
          .eq("is_active", true)
          .maybeSingle();

        if (permanentMembership) {
          console.log("[RevenueCatContext] User has permanent membership, preserving premium status");
          return; // Don't revert - user has manually-granted permanent membership
        }

        // No permanent membership - proceed with revert
        console.log("[RevenueCatContext] No permanent membership, syncing to database: false");

        // Update profiles.is_premium to false
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_premium: false })
          .eq("id", profileId);

        if (profileError) {
          console.error("[RevenueCatContext] Error setting is_premium to false:", profileError);
        } else {
          console.log("[RevenueCatContext] Synced premium status to database: false");
        }

        // Deactivate membership record (only non-permanent ones)
        const { error: membershipError } = await supabase
          .from("memberships")
          .update({ is_active: false })
          .eq("user_id", profileId)
          .eq("is_active", true)
          .neq("plan_type", "permanent");

        if (membershipError) {
          console.error("[RevenueCatContext] Error deactivating membership:", membershipError);
        } else {
          console.log("[RevenueCatContext] Deactivated membership record");
        }
      }

      // Invalidate React Query cache to refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      console.log("[RevenueCatContext] Invalidated profile and posts cache");
    } catch (error) {
      console.error("[RevenueCatContext] Exception syncing premium status:", error);
    }
  }, [profileId, queryClient]);

  // Update local state from CustomerInfo - MUST be defined before useEffects that use it
  const updateCustomerState = useCallback((info: CustomerInfo) => {
    console.log("[RevenueCatContext] updateCustomerState called");
    console.log("[RevenueCatContext] All active entitlements:", JSON.stringify(info.entitlements.active, null, 2));
    console.log("[RevenueCatContext] All entitlement keys:", Object.keys(info.entitlements.active));
    console.log("[RevenueCatContext] Looking for entitlement ID:", ENTITLEMENT_ID);
    console.log("[RevenueCatContext] Original App User ID:", info.originalAppUserId);

    setCustomerInfo(info);
    let entitlement = info.entitlements.active[ENTITLEMENT_ID];
    let isPro = entitlement !== undefined;

    // Fallback: if exact entitlement ID not found, check if ANY active entitlement exists
    // This handles cases where the entitlement ID in RevenueCat dashboard might differ slightly
    if (!isPro && Object.keys(info.entitlements.active).length > 0) {
      const firstEntitlementKey = Object.keys(info.entitlements.active)[0];
      console.log("[RevenueCatContext] FALLBACK: Exact entitlement not found, using first active entitlement:", firstEntitlementKey);
      entitlement = info.entitlements.active[firstEntitlementKey];
      isPro = true;
    }

    console.log("[RevenueCatContext] Entitlement found:", entitlement);
    console.log("[RevenueCatContext] isPro:", isPro);
    setIsProMember(isPro);

    // Sync to database with entitlement info for membership record
    syncPremiumStatusToDatabase(isPro, entitlement);

    if (entitlement) {
      setExpirationDate(entitlement.expirationDate ? new Date(entitlement.expirationDate) : null);
      setWillRenew(entitlement.willRenew);
    } else {
      setExpirationDate(null);
      setWillRenew(false);
    }
  }, [syncPremiumStatusToDatabase]);

  // Initialize RevenueCat on mount
  useEffect(() => {
    const initializeRevenueCat = async () => {
      console.log("[RevenueCatContext] Initializing...");
      const success = await revenueCatService.configure();
      if (success) {
        setIsInitialized(true);
        // Fetch initial offerings
        const offering = await revenueCatService.getOfferings();
        setCurrentOffering(offering);
        console.log("[RevenueCatContext] Initialized successfully");
      } else {
        console.error("[RevenueCatContext] Failed to initialize");
        // Still set initialized to true to prevent infinite loading
        setIsInitialized(true);
      }
    };

    initializeRevenueCat();
  }, []);

  // Handle user login/logout with RevenueCat
  useEffect(() => {
    const handleAuthChange = async () => {
      if (!isInitialized) return;

      const isAuthenticated = user !== null;
      const wasAuthenticated = previousUserRef.current !== null && previousUserRef.current !== undefined;

      if (isAuthenticated && profileId) {
        // Only login if we haven't already logged in for this profile
        if (loggedInProfileRef.current !== profileId) {
          console.log("[RevenueCatContext] User authenticated, logging in to RevenueCat:", profileId);
          const info = await revenueCatService.login(profileId);
          loggedInProfileRef.current = profileId;
          if (info) {
            updateCustomerState(info);
          }
        }
      } else if (!isAuthenticated && wasAuthenticated) {
        // User logged out (was previously logged in) - reset RevenueCat
        console.log("[RevenueCatContext] User logged out, resetting RevenueCat");
        await revenueCatService.logout();
        loggedInProfileRef.current = null;
        setCustomerInfo(null);
        setIsProMember(false);
        setExpirationDate(null);
        setWillRenew(false);
      }

      // Update previous user ref
      previousUserRef.current = user;
    };

    handleAuthChange();
  }, [user, profileId, isInitialized, updateCustomerState]);

  // Set up customer info update listener
  useEffect(() => {
    if (!isInitialized) return;

    const removeListener = revenueCatService.addCustomerInfoUpdateListener((info) => {
      console.log("[RevenueCatContext] Customer info updated via listener");
      updateCustomerState(info);
    });

    return () => {
      removeListener();
    };
  }, [isInitialized, updateCustomerState]);

  // Refresh customer info manually
  const refreshCustomerInfo = useCallback(async () => {
    const info = await revenueCatService.getCustomerInfo();
    if (info) {
      updateCustomerState(info);
    }
  }, [updateCustomerState]);

  // Check entitlement (useful for one-off checks)
  const checkEntitlement = useCallback(async (): Promise<boolean> => {
    return await revenueCatService.checkProEntitlement();
  }, []);

  const value: RevenueCatContextType = {
    isInitialized,
    isProMember,
    customerInfo,
    currentOffering,
    expirationDate,
    willRenew,
    refreshCustomerInfo,
    checkEntitlement,
  };

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
};
