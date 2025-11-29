import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { revenueCatService, ENTITLEMENT_ID } from "../services/revenueCatService";
import { useAuth } from "./AuthContext";

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isProMember, setIsProMember] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [willRenew, setWillRenew] = useState(false);

  // Track previous user to detect logout (not initial load)
  const previousUserRef = useRef<typeof user>(undefined);

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
        // User logged in - identify with RevenueCat
        console.log("[RevenueCatContext] User authenticated, logging in to RevenueCat:", profileId);
        const info = await revenueCatService.login(profileId);
        if (info) {
          updateCustomerState(info);
        }
      } else if (!isAuthenticated && wasAuthenticated) {
        // User logged out (was previously logged in) - reset RevenueCat
        console.log("[RevenueCatContext] User logged out, resetting RevenueCat");
        await revenueCatService.logout();
        setCustomerInfo(null);
        setIsProMember(false);
        setExpirationDate(null);
        setWillRenew(false);
      }

      // Update previous user ref
      previousUserRef.current = user;
    };

    handleAuthChange();
  }, [user, profileId, isInitialized]);

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
  }, [isInitialized]);

  // Update local state from CustomerInfo
  const updateCustomerState = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    const isPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    setIsProMember(isPro);

    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    if (entitlement) {
      setExpirationDate(entitlement.expirationDate ? new Date(entitlement.expirationDate) : null);
      setWillRenew(entitlement.willRenew);
    } else {
      setExpirationDate(null);
      setWillRenew(false);
    }
  }, []);

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
