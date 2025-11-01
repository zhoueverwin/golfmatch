import React, { useEffect, useRef, useCallback } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

import { Colors } from "../constants/colors";
import { RootStackParamList, MainTabParamList } from "../types";
import ErrorBoundary from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { MatchProvider } from "../contexts/MatchContext";
import { DataProvider } from "../services";
import { UserProfile } from "../types/dataModels";

// Import screens
import AuthScreen from "../screens/AuthScreen";
import LinkAccountScreen from "../screens/LinkAccountScreen";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import ConnectionsScreen from "../screens/ConnectionsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import MyPageScreen from "../screens/MyPageScreen";
import ChatScreen from "../screens/ChatScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen";
import NotificationHistoryScreen from "../screens/NotificationHistoryScreen";
import CalendarEditScreen from "../screens/CalendarEditScreen";
import TestAccountSetupScreen from "../screens/TestAccountSetupScreen";
import UserPostsScreen from "../screens/UserPostsScreen";
import FootprintsScreen from "../screens/FootprintsScreen";
import PastLikesScreen from "../screens/PastLikesScreen";
import ContactReplyScreen from "../screens/ContactReplyScreen";
import StoreScreen from "../screens/StoreScreen";

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Search":
              iconName = focused ? "search" : "search-outline";
              break;
            case "Connections":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Messages":
              iconName = focused ? "chatbubble" : "chatbubble-outline";
              break;
            case "MyPage":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "help-circle-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarButton: (props) => {
          const { children, ...restProps } = props;
          // Filter out props that TouchableOpacity doesn't accept
          const { delayLongPress, ...touchableProps } = restProps as any;
          return (
            <TouchableOpacity
              {...touchableProps}
              testID={`TAB.${route.name.toUpperCase()}`}
            >
              {children}
            </TouchableOpacity>
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray[500],
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "ホーム" }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: "さがす" }}
      />
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{ tabBarLabel: "つながり" }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarLabel: "メッセージ" }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{ tabBarLabel: "マイページ" }}
      />
    </Tab.Navigator>
  );
};

const AppNavigatorContent = () => {
  const { user, loading, profileId } = useAuth();
  const hasCheckedNewUser = useRef(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Calculate profile completion percentage
  const calculateProfileCompletion = (profile: UserProfile | null): number => {
    if (!profile) return 0;
    
    const fields = [
      // Basic info
      profile.basic?.name,
      profile.basic?.age,
      profile.basic?.gender,
      profile.basic?.prefecture,
      profile.basic?.blood_type,
      profile.basic?.height,
      profile.basic?.body_type,
      profile.basic?.smoking,
      
      // Golf info
      profile.golf?.skill_level,
      profile.golf?.experience,
      profile.golf?.average_score,
      profile.golf?.transportation,
      profile.golf?.play_fee,
      profile.golf?.available_days,
      
      // Bio and photos
      profile.bio,
      profile.profile_pictures?.length > 0,
    ];
    
    const filledFields = fields.filter(field => {
      if (typeof field === 'boolean') return field;
      return field && field.toString().trim() !== '' && field !== '0';
    }).length;
    
    return Math.round((filledFields / fields.length) * 100);
  };

  // Check if user is new and redirect to EditProfile
  const checkNewUserAndRedirect = useCallback(async () => {
    // Only check once when user becomes authenticated
    if (!user || !profileId || hasCheckedNewUser.current || loading) {
      return;
    }

    // Wait for navigation to be ready
    if (!navigationRef.current?.isReady()) {
      return;
    }

    // Mark as checked to prevent multiple redirects
    hasCheckedNewUser.current = true;

    try {
      // Get user profile
      const response = await DataProvider.getUserProfile(profileId);
      
      if (response.success && response.data) {
        const completion = calculateProfileCompletion(response.data);
        
        // If profile completion is less than 30%, redirect to EditProfile
        // This indicates a new user who hasn't filled in necessary information
        if (completion < 30) {
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            navigationRef.current?.navigate("EditProfile");
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error checking new user profile:", error);
    }
  }, [user, profileId, loading]);

  useEffect(() => {
    checkNewUserAndRedirect();
  }, [checkNewUserAndRedirect]);

  // Reset check flag when user logs out
  useEffect(() => {
    if (!user) {
      hasCheckedNewUser.current = false;
    }
  }, [user]);

  // Handle navigation ready event - check profile when navigation is ready
  const handleNavigationReady = useCallback(() => {
    checkNewUserAndRedirect();
  }, [checkNewUserAndRedirect]);

  if (loading) {
    return null; // Will show loading screen from AuthProvider
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
      <NotificationProvider>
        <MatchProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Profile"
              component={UserProfileScreen}
              options={{
                headerShown: true,
                headerTitle: "プロフィール",
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.white,
              }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                headerShown: true,
                headerTitle: "プロフィール編集",
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.white,
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{
                headerShown: true,
                headerTitle: "通知設定",
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.white,
              }}
            />
            <Stack.Screen
              name="NotificationHistory"
              component={NotificationHistoryScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="CalendarEdit"
              component={CalendarEditScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="LinkAccount"
              component={LinkAccountScreen}
              options={{
                headerShown: true,
                headerTitle: "アカウント連携",
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.white,
              }}
            />
            <Stack.Screen
              name="TestAccountSetup"
              component={TestAccountSetupScreen}
              options={{
                headerShown: true,
                headerTitle: "テストアカウント設定",
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.white,
              }}
            />
            <Stack.Screen
              name="UserPosts"
              component={UserPostsScreen}
              options={{
                headerShown: true,
                headerTitle: "投稿",
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.white,
              }}
            />
            <Stack.Screen
              name="Footprints"
              component={FootprintsScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="PastLikes"
              component={PastLikesScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="ContactReply"
              component={ContactReplyScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="Store"
              component={StoreScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
          </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
        </MatchProvider>
      </NotificationProvider>
    </NavigationContainer>
  );
};

const AppNavigator = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigatorContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default AppNavigator;
