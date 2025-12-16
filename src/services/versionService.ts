import { Platform, Linking } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

interface VersionConfig {
  ios: {
    latest_version: string;
    store_url: string;
  };
  android: {
    latest_version: string;
    store_url: string;
  };
  update_message: {
    title: string;
    body: string;
    button_text: string;
    dismiss_text: string;
  };
}

export interface VersionCheckResult {
  needsUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  storeUrl: string;
  message: VersionConfig["update_message"];
}

class VersionService {
  private cachedConfig: VersionConfig | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the current app version from expo config
   */
  getCurrentVersion(): string {
    return Constants.expoConfig?.version || "1.0.0";
  }

  /**
   * Compare two semantic version strings
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  compareVersions(a: string, b: string): number {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;

      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }

    return 0;
  }

  /**
   * Fetch version config from Supabase
   */
  async fetchVersionConfig(): Promise<VersionConfig | null> {
    // Return cached config if still valid
    const now = Date.now();
    if (this.cachedConfig && now - this.lastFetchTime < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "app_version")
        .single();

      if (error) {
        console.error("[VersionService] Error fetching version config:", error);
        return null;
      }

      this.cachedConfig = data.value as VersionConfig;
      this.lastFetchTime = now;

      return this.cachedConfig;
    } catch (error) {
      console.error("[VersionService] Exception fetching version config:", error);
      return null;
    }
  }

  /**
   * Check if an update is available
   */
  async checkForUpdate(): Promise<VersionCheckResult | null> {
    const config = await this.fetchVersionConfig();
    if (!config) return null;

    const platform = Platform.OS as "ios" | "android";
    const platformConfig = config[platform];

    if (!platformConfig) {
      console.warn(`[VersionService] No config for platform: ${platform}`);
      return null;
    }

    const currentVersion = this.getCurrentVersion();
    const latestVersion = platformConfig.latest_version;

    const needsUpdate = this.compareVersions(currentVersion, latestVersion) < 0;

    return {
      needsUpdate,
      currentVersion,
      latestVersion,
      storeUrl: platformConfig.store_url,
      message: config.update_message,
    };
  }

  /**
   * Open the appropriate app store
   */
  async openStore(storeUrl: string): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);
      }
    } catch (error) {
      console.error("[VersionService] Error opening store:", error);
    }
  }

  /**
   * Clear cached config (useful for testing)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastFetchTime = 0;
  }
}

export default new VersionService();
