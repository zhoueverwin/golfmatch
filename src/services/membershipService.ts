import { supabase } from "./supabase";
import { Membership, ServiceResponse, User } from "../types/dataModels";

export class MembershipService {
  /**
   * Get user's gender from profile
   * Checks multiple ID fields (id, legacy_id, user_id) for compatibility
   */
  private async getUserGender(userId: string): Promise<User["gender"] | null> {
    try {
      // Try to find profile by multiple possible ID fields
      const { data, error } = await supabase
        .from("profiles")
        .select("gender")
        .or(`id.eq.${userId},legacy_id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (error) {
        console.error("[MembershipService] Error fetching user gender:", error);
        return null;
      }

      return (data?.gender as User["gender"]) || null;
    } catch (error: any) {
      console.error("[MembershipService] Exception fetching user gender:", error);
      return null;
    }
  }

  /**
   * Cancel all active memberships for a female user
   * Called automatically when female user is detected
   */
  private async cancelMembershipForFemaleUsers(userId: string): Promise<void> {
    try {
      // Get all active memberships for this user
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) {
        console.error("[MembershipService] Error fetching memberships for cancellation:", error);
        return;
      }

      if (!memberships || memberships.length === 0) {
        return; // No memberships to cancel
      }

      const now = new Date().toISOString();
      const updates: Promise<any>[] = [];

      for (const membership of memberships) {
        updates.push(
          supabase
            .from("memberships")
            .update({
              is_active: false,
              expiration_date: membership.plan_type === "basic" ? now : membership.expiration_date,
            })
            .eq("id", membership.id)
        );
      }

      await Promise.all(updates);
      console.log(`[MembershipService] Cancelled ${memberships.length} membership(s) for female user`);
    } catch (error: any) {
      console.error("[MembershipService] Exception cancelling memberships for female user:", error);
    }
  }
  /**
   * Check if user has an active membership
   * Returns true if user has active membership (is_active = true AND not expired)
   */
  async checkActiveMembership(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("check_active_membership", {
        p_user_id: userId,
      });

      if (error) {
        console.error("[MembershipService] Error checking active membership:", error);
        return false;
      }

      return data === true;
    } catch (error: any) {
      console.error("[MembershipService] Exception checking active membership:", error);
      return false;
    }
  }

  /**
   * Get current membership information for a user
   * For female users: auto-cancels any existing memberships and returns null (free access)
   * For male/other users: returns membership as before
   */
  async getMembershipInfo(userId: string): Promise<ServiceResponse<Membership | null>> {
    try {
      // Check if user is female first
      const gender = await this.getUserGender(userId);
      
      if (gender === "female") {
        // Female users get free access - cancel any existing memberships
        await this.cancelMembershipForFemaleUsers(userId);
        // Return null to indicate no paid membership needed (free access)
        return {
          success: true,
          data: null,
        };
      }

      // For male and other genders, check membership status as before
      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No membership found
          return {
            success: true,
            data: null,
          };
        }
        console.error("[MembershipService] Error getting membership info:", error);
        return {
          success: false,
          error: error.message || "Failed to get membership info",
        };
      }

      return {
        success: true,
        data: data as Membership,
      };
    } catch (error: any) {
      console.error("[MembershipService] Exception getting membership info:", error);
      return {
        success: false,
        error: error.message || "Failed to get membership info",
      };
    }
  }

  /**
   * Create a new membership record after successful purchase
   */
  async createMembership(
    userId: string,
    planType: "basic" | "permanent",
    price: number,
    transactionId: string,
    platform: "ios" | "android",
  ): Promise<ServiceResponse<Membership>> {
    try {
      // Calculate expiration date for basic plan (1 month from now)
      const expirationDate =
        planType === "basic"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const { data, error } = await supabase
        .from("memberships")
        .insert({
          user_id: userId,
          plan_type: planType,
          price,
          purchase_date: new Date().toISOString(),
          expiration_date: expirationDate,
          is_active: true,
          store_transaction_id: transactionId,
          platform,
        })
        .select()
        .single();

      if (error) {
        console.error("[MembershipService] Error creating membership:", error);
        return {
          success: false,
          error: error.message || "Failed to create membership",
        };
      }

      return {
        success: true,
        data: data as Membership,
      };
    } catch (error: any) {
      console.error("[MembershipService] Exception creating membership:", error);
      return {
        success: false,
        error: error.message || "Failed to create membership",
      };
    }
  }

  /**
   * Validate and update membership status (check expiration, etc.)
   */
  async validateAndUpdateMembership(userId: string): Promise<void> {
    try {
      // Get all active memberships for user
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) {
        console.error("[MembershipService] Error validating membership:", error);
        return;
      }

      if (!memberships || memberships.length === 0) {
        return;
      }

      const now = new Date();
      const updates: Promise<any>[] = [];

      for (const membership of memberships) {
        // Deactivate expired basic plans
        if (
          membership.plan_type === "basic" &&
          membership.expiration_date &&
          new Date(membership.expiration_date) < now
        ) {
          updates.push(
            (async () => {
              await supabase
                .from("memberships")
                .update({ is_active: false })
                .eq("id", membership.id);
            })()
          );
        }
      }

      await Promise.all(updates);
    } catch (error: any) {
      console.error("[MembershipService] Exception validating membership:", error);
    }
  }

  /**
   * Cancel user's membership
   * For basic plans: Sets is_active = false and expiration_date = NOW()
   * For permanent plans: Sets is_active = false (requires repurchase to reactivate)
   * Immediately revokes message sending ability
   */
  async cancelMembership(userId: string): Promise<ServiceResponse<void>> {
    try {
      // Get active membership
      const membershipResult = await this.getMembershipInfo(userId);

      if (!membershipResult.success || !membershipResult.data) {
        return {
          success: false,
          error: "No active membership found to cancel",
        };
      }

      const membership = membershipResult.data;
      const now = new Date().toISOString();

      // Update membership to inactive
      const { error } = await supabase
        .from("memberships")
        .update({
          is_active: false,
          expiration_date: membership.plan_type === "basic" ? now : membership.expiration_date,
        })
        .eq("id", membership.id);

      if (error) {
        console.error("[MembershipService] Error canceling membership:", error);
        return {
          success: false,
          error: error.message || "Failed to cancel membership",
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("[MembershipService] Exception canceling membership:", error);
      return {
        success: false,
        error: error.message || "Failed to cancel membership",
      };
    }
  }

  /**
   * Schedule membership expiration for graceful cancellation
   * Sets expiration_date to end of current billing period (for basic plans)
   */
  async scheduleMembershipExpiration(userId: string): Promise<ServiceResponse<void>> {
    try {
      const membershipResult = await this.getMembershipInfo(userId);

      if (!membershipResult.success || !membershipResult.data) {
        return {
          success: false,
          error: "No active membership found",
        };
      }

      const membership = membershipResult.data;

      // Only applicable for basic plans
      if (membership.plan_type !== "basic") {
        return {
          success: false,
          error: "Cannot schedule expiration for permanent plans",
        };
      }

      // The expiration_date is already set correctly when created
      // This function is mainly for future use if we need to update expiration dates
      return {
        success: true,
      };
    } catch (error: any) {
      console.error("[MembershipService] Exception scheduling expiration:", error);
      return {
        success: false,
        error: error.message || "Failed to schedule expiration",
      };
    }
  }
}

export const membershipService = new MembershipService();

