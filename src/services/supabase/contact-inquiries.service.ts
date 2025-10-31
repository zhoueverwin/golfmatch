import { supabase } from "../supabase";
import {
  ContactInquiry,
  ContactReply,
  ServiceResponse,
} from "../../types/dataModels";

export class ContactInquiriesService {
  /**
   * Create a new contact inquiry
   * @param userId - The user's profile ID
   * @param subject - Inquiry subject/title
   * @param message - Inquiry message content
   * @param inquiryType - Type of inquiry (optional)
   * @returns Created inquiry
   */
  async createContactInquiry(
    userId: string,
    subject: string,
    message: string,
    inquiryType?: string,
  ): Promise<ServiceResponse<ContactInquiry>> {
    try {
      // Resolve legacy IDs if needed
      let actualUserId = userId;
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

      // Create inquiry
      const { data: inquiry, error: inquiryError } = await supabase
        .from("contact_inquiries")
        .insert({
          user_id: actualUserId,
          subject,
          message,
          status: "pending",
        })
        .select()
        .single();

      if (inquiryError) throw inquiryError;

      return {
        success: true,
        data: inquiry as ContactInquiry,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create contact inquiry",
      };
    }
  }

  /**
   * Get all contact inquiries for a user
   * @param userId - The user's profile ID
   * @returns List of inquiries with replies
   */
  async getContactInquiries(
    userId: string,
  ): Promise<ServiceResponse<ContactInquiry[]>> {
    try {
      // Resolve legacy IDs if needed
      let actualUserId = userId;
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
            data: [],
          };
        }

        actualUserId = profile.id;
      }

      // Fetch inquiries with replies
      const { data: inquiries, error: inquiriesError } = await supabase
        .from("contact_inquiries")
        .select("*")
        .eq("user_id", actualUserId)
        .order("created_at", { ascending: false });

      if (inquiriesError) throw inquiriesError;

      // Fetch replies for each inquiry
      const inquiriesWithReplies = await Promise.all(
        (inquiries || []).map(async (inquiry) => {
          const { data: replies, error: repliesError } = await supabase
            .from("contact_replies")
            .select("*")
            .eq("inquiry_id", inquiry.id)
            .order("created_at", { ascending: true });

          if (repliesError) {
            console.error(`Error fetching replies for inquiry ${inquiry.id}:`, repliesError);
          }

          const unreadCount = (replies || []).filter((r) => !r.is_read).length;

          return {
            ...inquiry,
            replies: replies || [],
            unread_reply_count: unreadCount,
          } as ContactInquiry;
        }),
      );

      return {
        success: true,
        data: inquiriesWithReplies,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch contact inquiries",
        data: [],
      };
    }
  }

  /**
   * Get a single contact inquiry with replies
   * @param inquiryId - The inquiry ID
   * @returns Single inquiry with replies
   */
  async getContactInquiry(
    inquiryId: string,
  ): Promise<ServiceResponse<ContactInquiry>> {
    try {
      // Fetch inquiry
      const { data: inquiry, error: inquiryError } = await supabase
        .from("contact_inquiries")
        .select("*")
        .eq("id", inquiryId)
        .single();

      if (inquiryError) throw inquiryError;
      if (!inquiry) {
        return {
          success: false,
          error: `Inquiry not found: ${inquiryId}`,
        };
      }

      // Fetch replies
      const { data: replies, error: repliesError } = await supabase
        .from("contact_replies")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error(`Error fetching replies for inquiry ${inquiryId}:`, repliesError);
      }

      const unreadCount = (replies || []).filter((r) => !r.is_read).length;

      return {
        success: true,
        data: {
          ...inquiry,
          replies: replies || [],
          unread_reply_count: unreadCount,
        } as ContactInquiry,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch contact inquiry",
      };
    }
  }

  /**
   * Mark a reply as read
   * @param replyId - The reply ID
   * @returns Success status
   */
  async markReplyAsRead(replyId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from("contact_replies")
        .update({ is_read: true })
        .eq("id", replyId);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to mark reply as read",
      };
    }
  }

  /**
   * Mark all replies for an inquiry as read
   * @param inquiryId - The inquiry ID
   * @returns Success status
   */
  async markAllRepliesAsRead(
    inquiryId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from("contact_replies")
        .update({ is_read: true })
        .eq("inquiry_id", inquiryId)
        .eq("is_read", false);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to mark replies as read",
      };
    }
  }
}

export const contactInquiriesService = new ContactInquiriesService();

