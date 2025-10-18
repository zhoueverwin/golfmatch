import { supabase } from "../supabase";
import {
  Availability,
  CalendarData,
  ServiceResponse,
} from "../../types/dataModels";

export class AvailabilityService {
  async getUserAvailability(
    userId: string,
    month: number,
    year: number,
  ): Promise<ServiceResponse<CalendarData>> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;

      // If userId is not a UUID, try to find it by legacy_id
      if (
        !userId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", userId)
          .single();

        if (profileError || !profile) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            data: {
              year,
              month,
              days: [],
            },
          };
        }

        actualUserId = profile.id;
      }

      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("user_id", actualUserId)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) throw error;

      const calendarData: CalendarData = {
        year,
        month,
        days: (data || []) as Availability[],
      };

      return {
        success: true,
        data: calendarData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch availability",
        data: {
          year,
          month,
          days: [],
        },
      };
    }
  }

  async setAvailability(
    userId: string,
    date: string,
    isAvailable: boolean,
    timeSlots?: string[],
    notes?: string,
  ): Promise<ServiceResponse<Availability>> {
    try {
      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;

      // If userId is not a UUID, try to find it by legacy_id
      if (
        !userId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", userId)
          .single();

        if (profileError || !profile) {
          return {
            success: false,
            error: `User not found: ${userId}`,
          };
        }

        actualUserId = profile.id;
      }

      const { data, error } = await supabase
        .from("availability")
        .upsert({
          user_id: actualUserId,
          date,
          is_available: isAvailable,
          time_slots: timeSlots || [],
          notes: notes || "",
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Availability,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to set availability",
      };
    }
  }

  async deleteAvailability(
    userId: string,
    date: string,
  ): Promise<ServiceResponse<void>> {
    try {
      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;

      // If userId is not a UUID, try to find it by legacy_id
      if (
        !userId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", userId)
          .single();

        if (profileError || !profile) {
          return {
            success: false,
            error: `User not found: ${userId}`,
          };
        }

        actualUserId = profile.id;
      }

      const { error } = await supabase
        .from("availability")
        .delete()
        .match({ user_id: actualUserId, date });

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete availability",
      };
    }
  }

  subscribeToAvailability(
    userId: string,
    callback: (availability: Availability) => void,
  ) {
    const subscription = supabase
      .channel(`availability:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Availability);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const availabilityService = new AvailabilityService();
