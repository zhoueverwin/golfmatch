import { supabase } from "../supabase";
import {
  Message,
  MessagePreview,
  ServiceResponse,
} from "../../types/dataModels";

export interface ChatPreview {
  chat_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_image: string;
  last_message: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_online: boolean;
}

export interface UnmessagedMatch {
  match_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_age: number;
  other_user_prefecture: string;
  other_user_location: string | null;
  other_user_image: string;
}

export class MessagesService {
  /**
   * Get user's chats with last message preview (uses optimized SQL function)
   */
  async getUserChats(userId: string): Promise<ServiceResponse<ChatPreview[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_chats', { p_user_id: userId });

      if (error) throw error;

      return {
        success: true,
        data: (data as ChatPreview[]) || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load chats',
        data: [],
      };
    }
  }

  async getChatMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*),
          receiver:profiles!messages_receiver_id_fkey(*)
        `,
        )
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data as Message[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch messages",
        data: [],
      };
    }
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    text: string,
    type: "text" | "image" | "emoji" | "video" = "text",
    imageUri?: string,
  ): Promise<ServiceResponse<Message>> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          receiver_id: receiverId,
          text,
          type,
          image_uri: imageUri,
          is_read: false,
        })
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*),
          receiver:profiles!messages_receiver_id_fkey(*)
        `,
        )
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send message",
      };
    }
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to mark message as read",
      };
    }
  }

  async getMessagePreviews(
    userId: string,
  ): Promise<ServiceResponse<MessagePreview[]>> {
    try {
      const { data: chats, error: chatsError } = await supabase
        .from("chats")
        .select(
          `
          id,
          match_id,
          participants,
          updated_at,
          match:matches!chats_match_id_fkey(
            user1:profiles!matches_user1_id_fkey(*),
            user2:profiles!matches_user2_id_fkey(*)
          )
        `,
        )
        .contains("participants", [userId])
        .order("updated_at", { ascending: false });

      if (chatsError) throw chatsError;

      const previews: MessagePreview[] = await Promise.all(
        (chats || []).map(async (chat) => {
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count: unreadCount } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_id", chat.id)
            .eq("receiver_id", userId)
            .eq("is_read", false);

          const match = chat.match as any;
          const otherUser =
            match.user1.id === userId ? match.user2 : match.user1;

          return {
            id: chat.id,
            userId: otherUser.id,
            name: otherUser.name,
            profileImage: otherUser.profile_pictures?.[0] || "",
            lastMessage: lastMessage?.text || "",
            timestamp: (lastMessage?.created_at || chat.updated_at) as string,
            isUnread: (unreadCount || 0) > 0,
            unreadCount: unreadCount || 0,
          } as MessagePreview;
        }),
      );

      return {
        success: true,
        data: previews,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch message previews",
        data: [],
      };
    }
  }

  async getOrCreateChat(
    matchId: string,
    participants: string[],
  ): Promise<ServiceResponse<string>> {
    try {
      const { data: existingChat } = await supabase
        .from("chats")
        .select("id")
        .eq("match_id", matchId)
        .single();

      if (existingChat) {
        return {
          success: true,
          data: existingChat.id,
        };
      }

      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          match_id: matchId,
          participants,
        })
        .select("id")
        .single();

      if (error) throw error;

      return {
        success: true,
        data: newChat.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get or create chat",
      };
    }
  }

  /**
   * Get or create chat between two users (uses SQL function with duplicate prevention)
   */
  async getOrCreateChatBetweenUsers(
    user1Id: string,
    user2Id: string,
    matchId?: string
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_chat', {
          p_user1_id: user1Id,
          p_user2_id: user2Id,
          p_match_id: matchId || null
        });

      if (error) throw error;

      return {
        success: true,
        data: data as string, // chat_id
      };
    } catch (error: any) {
      console.error('Failed to get/create chat:', error);
      return {
        success: false,
        error: error.message || 'Failed to create chat',
      };
    }
  }

  /**
   * Get matches where no messages have been exchanged yet
   * Returns matches with other user's profile info (age, prefecture, location, profile_pictures)
   */
  async getUnmessagedMatches(userId: string): Promise<ServiceResponse<UnmessagedMatch[]>> {
    try {
      // Get all active matches for the user
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
          id,
          user1_id,
          user2_id,
          user1:profiles!matches_user1_id_fkey(
            id,
            name,
            age,
            prefecture,
            location,
            profile_pictures
          ),
          user2:profiles!matches_user2_id_fkey(
            id,
            name,
            age,
            prefecture,
            location,
            profile_pictures
          )
        `
        )
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("is_active", true)
        .order("matched_at", { ascending: false });

      if (matchesError) throw matchesError;

      if (!matches || matches.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Get all chat IDs that have messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("chat_id");

      if (messagesError) throw messagesError;

      // Get unique chat_ids
      const chatIdsWithMessages = new Set(
        (messagesData || []).map((m: any) => m.chat_id)
      );

      // Get all chats for these matches
      const matchIds = matches.map((m: any) => m.id);
      const { data: chats, error: chatsQueryError } = await supabase
        .from("chats")
        .select("id, match_id")
        .in("match_id", matchIds);

      if (chatsQueryError) throw chatsQueryError;

      // Create a map of match_id -> chat_id
      const matchChatMap = new Map<string, string>();
      (chats || []).forEach((chat: any) => {
        matchChatMap.set(chat.match_id, chat.id);
      });

      // Filter matches that have no chat OR have a chat but no messages
      const unmessagedMatches: UnmessagedMatch[] = [];

      for (const match of matches || []) {
        const matchData = match as any;
        const chatId = matchChatMap.get(matchData.id);
        
        // If no chat exists, or chat exists but has no messages
        if (!chatId || !chatIdsWithMessages.has(chatId)) {
          // Determine the other user
          const otherUser =
            matchData.user1_id === userId ? matchData.user2 : matchData.user1;

          if (otherUser) {
            unmessagedMatches.push({
              match_id: matchData.id,
              other_user_id: otherUser.id,
              other_user_name: otherUser.name || "",
              other_user_age: otherUser.age || 0,
              other_user_prefecture: otherUser.prefecture || "",
              other_user_location: otherUser.location || null,
              other_user_image: otherUser.profile_pictures?.[0] || "",
            });
          }
        }
      }

      return {
        success: true,
        data: unmessagedMatches,
      };
    } catch (error: any) {
      console.error("Failed to get unmessaged matches:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch unmessaged matches",
        data: [],
      };
    }
  }

  subscribeToChat(chatId: string, callback: (message: Message) => void) {
    const channel = supabase
      .channel(`chat:${chatId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: chatId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          try {
            // Fetch the full message with relations
            const { data, error } = await supabase
              .from("messages")
              .select(
                `
                *,
                sender:profiles!messages_sender_id_fkey(*),
                receiver:profiles!messages_receiver_id_fkey(*)
              `,
              )
              .eq("id", payload.new.id)
              .single();

            if (error) {
              console.error("[MessagesService] Error fetching message:", error);
              // Fallback: use payload data if fetch fails
              callback(payload.new as Message);
              return;
            }

            if (data) {
              callback(data as Message);
            }
          } catch (error) {
            console.error("[MessagesService] Error in subscription callback:", error);
            // Fallback: use payload data
            callback(payload.new as Message);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[MessagesService] Successfully subscribed to chat:${chatId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[MessagesService] Channel error for chat:${chatId}`);
        } else if (status === "TIMED_OUT") {
          console.error(`[MessagesService] Subscription timeout for chat:${chatId}`);
        } else if (status === "CLOSED") {
          console.log(`[MessagesService] Channel closed for chat:${chatId}`);
        }
      });

    return () => {
      console.log(`[MessagesService] Unsubscribing from chat:${chatId}`);
      channel.unsubscribe();
    };
  }
}

export const messagesService = new MessagesService();
