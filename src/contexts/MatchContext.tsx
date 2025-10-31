import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useAuth } from "./AuthContext";
import { DataProvider } from "../services";
import { supabase } from "../services/supabase";
import MatchCelebrationModal from "../components/MatchCelebrationModal";

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: string;
  user1?: {
    id: string;
    name: string;
    profile_pictures?: string[];
  };
  user2?: {
    id: string;
    name: string;
    profile_pictures?: string[];
  };
}

interface MatchContextType {
  isShowingMatch: boolean;
  currentMatch: Match | null;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

interface MatchProviderProps {
  children: ReactNode;
}

export const MatchProvider: React.FC<MatchProviderProps> = ({ children }) => {
  const { profileId } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [unseenMatches, setUnseenMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [isShowingMatch, setIsShowingMatch] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    id: string;
    name: string;
    image: string;
  } | null>(null);

  const appState = useRef(AppState.currentState);
  const matchesSubscriptionRef = useRef<any>(null);
  const shownMatchIds = useRef<Set<string>>(new Set()); // Track which matches we've already shown this session

  // Subscribe to real-time match events
  useEffect(() => {
    if (!profileId) {
      // Cleanup subscription if user logs out
      if (matchesSubscriptionRef.current) {
        matchesSubscriptionRef.current.unsubscribe();
        matchesSubscriptionRef.current = null;
      }
      shownMatchIds.current.clear();
      return;
    }

    console.log("[MatchContext] Setting up real-time subscription for matches");
    
    // Subscribe to new matches in real-time
    const matchesChannel = supabase
      .channel(`match-popup-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
        },
        async (payload) => {
          const match = payload.new as any;
          console.log("[MatchContext] Real-time match INSERT detected:", match.id);
          
          // Check if this match involves the current user
          if (
            (match.user1_id === profileId || match.user2_id === profileId) &&
            !shownMatchIds.current.has(match.id)
          ) {
            console.log("[MatchContext] Match involves current user, loading full match data");
            // Fetch full match data with user profiles
            const { data: fullMatch, error } = await supabase
              .from("matches")
              .select(`
                *,
                user1:profiles!matches_user1_id_fkey(id, name, profile_pictures),
                user2:profiles!matches_user2_id_fkey(id, name, profile_pictures)
              `)
              .eq("id", match.id)
              .single();

            if (!error && fullMatch) {
              console.log("[MatchContext] Showing match popup immediately for real-time match");
              // Show popup immediately for this new match
              setCurrentMatch(fullMatch as Match);
              setIsShowingMatch(true);
              shownMatchIds.current.add(match.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[MatchContext] Subscription status:", status);
      });

    matchesSubscriptionRef.current = matchesChannel;

    return () => {
      if (matchesSubscriptionRef.current) {
        console.log("[MatchContext] Cleaning up real-time subscription");
        matchesSubscriptionRef.current.unsubscribe();
        matchesSubscriptionRef.current = null;
      }
    };
  }, [profileId]);

  // Initialize matches when user logs in (only check for existing unseen matches)
  useEffect(() => {
    if (profileId) {
      console.log("[MatchContext] User logged in, checking for existing unseen matches");
      loadUnseenMatches();
      loadCurrentUserProfile();
    } else {
      setUnseenMatches([]);
      setCurrentMatch(null);
      setIsShowingMatch(false);
      shownMatchIds.current.clear();
    }
  }, [profileId]);

  // DON'T check for matches on app foreground - this causes duplicates
  // Real-time subscription handles new matches
  // Only check on initial login above

  const loadCurrentUserProfile = async () => {
    if (!profileId) return;

    try {
      const response = await DataProvider.getUser(profileId);
      if (response.success && response.data) {
        setCurrentUserProfile({
          id: response.data.id,
          name: response.data.name,
          image:
            response.data.profile_pictures && response.data.profile_pictures[0]
              ? response.data.profile_pictures[0]
              : "",
        });
      }
    } catch (error) {
      console.error("Error loading current user profile:", error);
    }
  };

  const loadUnseenMatches = async () => {
    if (!profileId) return;

    try {
      console.log("[MatchContext] Loading unseen matches for user:", profileId);
      const response = await DataProvider.getUnseenMatches(profileId);
      if (response.success && response.data) {
        const matches = response.data as Match[];
        console.log("[MatchContext] Found", matches.length, "unseen matches in database");
        
        // Filter out matches we've already shown this session
        const unseenUnshown = matches.filter(m => !shownMatchIds.current.has(m.id));
        console.log("[MatchContext]", unseenUnshown.length, "matches not yet shown this session");
        
        setUnseenMatches(unseenUnshown);
        
        // Show first unseen match if not currently showing one
        if (!isShowingMatch && unseenUnshown.length > 0) {
          console.log("[MatchContext] Showing first unseen match:", unseenUnshown[0].id);
          const match = unseenUnshown[0];
          setCurrentMatch(match);
          setIsShowingMatch(true);
          shownMatchIds.current.add(match.id);
        }
      } else {
        console.error("[MatchContext] Failed to load unseen matches:", response.error);
      }
    } catch (error) {
      console.error("[MatchContext] Error loading unseen matches:", error);
    }
  };

  const markMatchAsSeen = async (matchId: string) => {
    if (!profileId) return;

    try {
      console.log("[MatchContext] Marking match as seen:", matchId);
      await DataProvider.markMatchAsSeen(matchId, profileId);
      // Remove from queue
      setUnseenMatches((prev) => prev.filter((m) => m.id !== matchId));
      // Add to shown set (in case it wasn't already there)
      shownMatchIds.current.add(matchId);
    } catch (error) {
      console.error("Error marking match as seen:", error);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!currentMatch || !profileId) return;

    const matchId = currentMatch.id;
    const otherUserId =
      currentMatch.user1_id === profileId
        ? currentMatch.user2_id
        : currentMatch.user1_id;
    const otherUser =
      currentMatch.user1_id === profileId
        ? currentMatch.user2
        : currentMatch.user1;

    if (!otherUser) {
      console.error("Other user data not found");
      return;
    }

    // Mark match as seen
    await markMatchAsSeen(matchId);

    // Close the modal
    setIsShowingMatch(false);
    setCurrentMatch(null);

    try {
      // Get or create chat between the two users
      const chatResponse = await DataProvider.getOrCreateChatBetweenUsers(
        profileId,
        otherUserId,
        matchId,
      );

      if (chatResponse.success && chatResponse.data) {
        // Navigate to chat screen
        navigation.navigate("Chat", {
          chatId: chatResponse.data,
          userId: otherUserId,
          userName: otherUser.name || "ユーザー",
          userImage:
            otherUser.profile_pictures && otherUser.profile_pictures[0]
              ? otherUser.profile_pictures[0]
              : "",
        });
      } else {
        console.error("Failed to create/get chat:", chatResponse.error);
      }
    } catch (error) {
      console.error("Error navigating to chat:", error);
    }

    // Show next match after a brief delay (will be handled by useEffect)
  }, [currentMatch, profileId, navigation]);

  const handleClose = useCallback(async () => {
    if (!currentMatch || !profileId) return;

    const matchId = currentMatch.id;

    // Mark match as seen
    await markMatchAsSeen(matchId);

    // Close the modal
    setIsShowingMatch(false);
    setCurrentMatch(null);

    // Show next match after a brief delay (will be handled by useEffect)
  }, [currentMatch, profileId]);

  // Show next match when current one is dismissed and there are more in queue
  useEffect(() => {
    if (
      !isShowingMatch &&
      unseenMatches.length > 0
    ) {
      // Small delay before showing next match
      const timer = setTimeout(() => {
        const nextMatch = unseenMatches[0];
        console.log("[MatchContext] Showing next match from queue:", nextMatch.id);
        setCurrentMatch(nextMatch);
        setIsShowingMatch(true);
        shownMatchIds.current.add(nextMatch.id);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [unseenMatches, isShowingMatch]);

  // Prepare match data for the modal
  const matchData = currentMatch
    ? {
        matchId: currentMatch.id,
        otherUser: {
          id:
            currentMatch.user1_id === profileId
              ? currentMatch.user2_id
              : currentMatch.user1_id,
          name:
            currentMatch.user1_id === profileId
              ? currentMatch.user2?.name || "ユーザー"
              : currentMatch.user1?.name || "ユーザー",
          image:
            currentMatch.user1_id === profileId
              ? currentMatch.user2?.profile_pictures?.[0] || ""
              : currentMatch.user1?.profile_pictures?.[0] || "",
        },
        currentUser: currentUserProfile || undefined,
      }
    : null;

  const contextValue: MatchContextType = {
    isShowingMatch,
    currentMatch,
  };

  return (
    <MatchContext.Provider value={contextValue}>
      {children}
      {matchData && (
        <MatchCelebrationModal
          visible={isShowingMatch}
          matchData={matchData}
          onSendMessage={handleSendMessage}
          onClose={handleClose}
        />
      )}
    </MatchContext.Provider>
  );
};

export const useMatch = (): MatchContextType => {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error("useMatch must be used within MatchProvider");
  }
  return context;
};

