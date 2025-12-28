import React, { useEffect, useRef, useCallback, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View, Image, Text } from "react-native";

import { Colors } from "../constants/colors";
import { RootStackParamList, MainTabParamList } from "../types";
import ErrorBoundary from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NotificationProvider, useNotifications } from "../contexts/NotificationContext";
import { MatchProvider } from "../contexts/MatchContext";
import { RevenueCatProvider } from "../contexts/RevenueCatContext";
import { DataProvider } from "../services";
import { UserProfile } from "../types/dataModels";
import UpdatePromptModal from "../components/UpdatePromptModal";
import { useAppUpdate } from "../hooks/useAppUpdate";

// Import screens
import AuthScreen from "../screens/AuthScreen";
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
import HelpScreen from "../screens/HelpScreen";
import HelpDetailScreen from "../screens/HelpDetailScreen";
import KycVerificationScreen from "../screens/KycVerificationScreen";
import DeleteAccountScreen from "../screens/DeleteAccountScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import ReportScreen from "../screens/ReportScreen";
import BlockedUsersScreen from "../screens/BlockedUsersScreen";
import HiddenPostsScreen from "../screens/HiddenPostsScreen";

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom tab bar component
const CustomTabBar = (props: BottomTabBarProps) => {
  const { insets } = props;
  const tabBarHeight = 65;
  const { hasNewConnections, hasNewMyPageNotification, hasNewMessages } = useNotifications();

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom * 0.5, 4),
        backgroundColor: "rgba(255,255,255,1)",
        borderTopWidth: 0,
        height: tabBarHeight + Math.max(insets.bottom * 0.5, 4),
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          height: tabBarHeight,
        }}
      >
        {props.state.routes.map((route, index) => {
          const { options } = props.descriptors[route.key];
          const isFocused = props.state.index === index;

          const onPress = () => {
            const event = props.navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              props.navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            props.navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const iconSize = 22;
          let iconSource;
          switch (route.name) {
            case "Home":
              iconSource = isFocused
                ? require("../../assets/images/Icons/Home-Fill.png")
                : require("../../assets/images/Icons/Home-Outline.png");
              break;
            case "Search":
              iconSource = isFocused
                ? require("../../assets/images/Icons/Search-Fill.png")
                : require("../../assets/images/Icons/Search-Outline.png");
              break;
            case "Connections":
              iconSource = isFocused
                ? require("../../assets/images/Icons/Users-Fill.png")
                : require("../../assets/images/Icons/Users-Outline.png");
              break;
            case "Messages":
              iconSource = isFocused
                ? require("../../assets/images/Icons/Message-Fill.png")
                : require("../../assets/images/Icons/Message-Outline.png");
              break;
            case "MyPage":
              iconSource = isFocused
                ? require("../../assets/images/Icons/Profile-Fill.png")
                : require("../../assets/images/Icons/Profile-Outline.png");
              break;
            default:
              return null;
          }

          const label =
            route.name === "Home"
              ? "ホーム"
              : route.name === "Search"
              ? "さがす"
              : route.name === "Connections"
              ? "つながり"
              : route.name === "Messages"
              ? "メッセージ"
              : route.name === "MyPage"
              ? "マイページ"
              : "";

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 20,
                paddingBottom: 14,
              }}
            >
              <View style={{ position: "relative" }}>
                <Image
                  source={iconSource}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    marginTop: -2,
                    marginBottom: 4,
                  }}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                {route.name === "Connections" && hasNewConnections && (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: Colors.primary,
                    }}
                  />
                )}
                {route.name === "Messages" && hasNewMessages && (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: Colors.primary,
                    }}
                  />
                )}
                {route.name === "MyPage" && hasNewMyPageNotification && (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: Colors.primary,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 0,
                  color: isFocused ? Colors.primary : Colors.gray[500],
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: 0,
        },
      }}
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

  // Check for app updates when user is authenticated
  const {
    updateInfo,
    showPrompt,
    dismissPrompt,
    openStore,
  } = useAppUpdate({ enabled: !!user });

  const hasCheckedNewUser = useRef(false);
  const profileCheckPassed = useRef(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null); // null = checking, true = new, false = existing

  // Calculate profile completion percentage
  const calculateProfileCompletion = (profile: UserProfile | null): number => {
    if (!profile) return 0;
    
    // Placeholder values that should be treated as unfilled
    const PLACEHOLDER_VALUES = ['未設定', '0', 0, '', null, undefined];
    
    const isFieldFilled = (field: any): boolean => {
      if (typeof field === 'boolean') return field;
      if (field === null || field === undefined) return false;
      
      const stringValue = field.toString().trim();
      
      // Check if it's a placeholder value
      if (PLACEHOLDER_VALUES.includes(stringValue) || PLACEHOLDER_VALUES.includes(field)) {
        return false;
      }
      
      // Check if it's an empty string
      if (stringValue === '') return false;
      
      // For numbers, check if it's 0 (which means not set)
      if (typeof field === 'number' && field === 0) return false;
      
      return true;
    };
    
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
      profile.golf?.available_days,
      
      // Bio and photos
      profile.bio,
      profile.profile_pictures?.length > 0,
    ];
    
    const filledFields = fields.filter(isFieldFilled).length;
    
    return Math.round((filledFields / fields.length) * 100);
  };

  // Check if user is new and redirect to EditProfile
  const checkNewUserAndRedirect = useCallback(async () => {
    // Only check once when user becomes authenticated
    if (!user || hasCheckedNewUser.current || loading) {
      return;
    }

    // If user exists but profileId is null after retries, wait for it
    // Don't immediately assume new user - could be network issue
    if (user && !profileId) {
      // Clear any existing timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      // Wait longer for profile fetch on slow connections
      // AuthContext already retries 3 times with delays, so profile should be available
      // If still null after extended wait, assume existing user to avoid wrong redirect
      redirectTimeoutRef.current = setTimeout(() => {
        // Don't redirect if profile check has already passed
        if (profileCheckPassed.current) {
          return;
        }
        // After extended wait, if profileId is still null, assume network issue
        // Don't redirect to EditProfile - let user stay on current screen
        console.log('[AppNavigator] ProfileId still null after timeout, assuming network issue');
        hasCheckedNewUser.current = true;
        profileCheckPassed.current = true;
        setIsNewUser(false); // Assume existing user to avoid wrong redirect
      }, 5000); // Wait 5 seconds (AuthContext retries take up to 6 seconds total)
      return;
    }

    // profileId is now available - cancel any pending redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // If profileId is still null, don't proceed (shouldn't reach here after retries)
    if (!profileId) {
      return;
    }

    // Mark as checked to prevent multiple redirects
    hasCheckedNewUser.current = true;

    try {
      // Get user profile
      const response = await DataProvider.getUserProfile(profileId);

      if (response.success && response.data) {
        const profile = response.data;
        const completion = calculateProfileCompletion(profile);

        // Check if user has edited essential fields (indicating they've completed initial setup)
        // Essential fields: name, age > 0, gender, prefecture != '未設定'
        const hasName = !!profile.basic?.name;
        const hasAge = !!profile.basic?.age && parseInt(profile.basic.age.toString()) > 0;
        const hasGender = !!profile.basic?.gender;
        const hasPrefecture = !!profile.basic?.prefecture && profile.basic.prefecture !== '未設定';

        const hasEssentialFields = hasName && hasAge && hasGender && hasPrefecture;

        // Only mark as new user if:
        // 1. Profile completion is less than 30% AND
        // 2. Essential fields are not filled (user hasn't completed initial setup)
        if (completion < 30 && !hasEssentialFields) {
          setIsNewUser(true);
        } else {
          // Mark profile check as passed to prevent other redirects
          profileCheckPassed.current = true;
          setIsNewUser(false);
        }
      } else if (!response.success) {
        // Check if it's a network error vs profile not found
        const errorMessage = response.error?.toLowerCase() || '';
        const isNetworkError = errorMessage.includes('network') ||
                              errorMessage.includes('timeout') ||
                              errorMessage.includes('fetch') ||
                              errorMessage.includes('connection');

        if (isNetworkError) {
          // Network error - assume existing user to avoid wrongly redirecting to EditProfile
          console.log('[AppNavigator] Network error while checking profile, assuming existing user');
          profileCheckPassed.current = true;
          setIsNewUser(false);
        } else {
          // Profile might not exist yet, mark as new user
          setIsNewUser(true);
        }
      }
    } catch (error) {
      console.error("Error checking new user profile:", error);
      // On error, assume existing user to avoid blocking
      profileCheckPassed.current = true;
      setIsNewUser(false);
    }
  }, [user, profileId, loading]);

  useEffect(() => {
    checkNewUserAndRedirect();
  }, [checkNewUserAndRedirect]);

  // Reset check flags when user logs out
  useEffect(() => {
    if (!user) {
      hasCheckedNewUser.current = false;
      profileCheckPassed.current = false;
      setIsNewUser(null); // Reset to checking state
      // Clear any pending redirect timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    }
  }, [user]);

  // Handle navigation ready event - check profile when navigation is ready
  const handleNavigationReady = useCallback(() => {
    checkNewUserAndRedirect();
  }, [checkNewUserAndRedirect]);

  if (loading) {
    return null; // Will show loading screen from AuthProvider
  }

  // Show loading while checking if user is new (only for authenticated users)
  if (user && isNewUser === null) {
    return null; // Will show loading screen while checking profile
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
      <NotificationProvider>
          <MatchProvider>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
            <>
              {/* Show EditProfile first for new users, Main first for existing users */}
              {isNewUser ? (
                <>
                  <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Main" component={MainTabNavigator} />
                </>
              ) : (
                <>
                  <Stack.Screen name="Main" component={MainTabNavigator} />
                  <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
                </>
              )}
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
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
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
                headerShown: false, // Custom header in component
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
              name="KycVerification"
              component={KycVerificationScreen}
              options={{
                headerShown: false, // Custom header in component
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
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
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
            <Stack.Screen
              name="Help"
              component={HelpScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="HelpDetail"
              component={HelpDetailScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="DeleteAccount"
              component={DeleteAccountScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="Report"
              component={ReportScreen}
              options={{
                headerShown: false, // Custom header in component
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="BlockedUsers"
              component={BlockedUsersScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
            <Stack.Screen
              name="HiddenPosts"
              component={HiddenPostsScreen}
              options={{
                headerShown: false, // Custom header in component
              }}
            />
          </>
          ) : (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: true,
                  gestureDirection: "horizontal",
                  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                }}
              />
            </>
          )}
        </Stack.Navigator>
          </MatchProvider>

          {/* Update Prompt Modal */}
          {updateInfo && (
            <UpdatePromptModal
              visible={showPrompt}
              title={updateInfo.message.title}
              body={updateInfo.message.body}
              buttonText={updateInfo.message.button_text}
              dismissText={updateInfo.message.dismiss_text}
              currentVersion={updateInfo.currentVersion}
              latestVersion={updateInfo.latestVersion}
              isForced={updateInfo.isForced}
              onUpdate={openStore}
              onDismiss={dismissPrompt}
            />
          )}
        </NotificationProvider>
    </NavigationContainer>
  );
};

const AppNavigator = ({ onReady }: { onReady?: () => void }) => {
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);

  const handleNavigationReady = useCallback(() => {
    setIsNavigationReady(true);
    onReady?.();
  }, [onReady]);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RevenueCatProvider>
          <View style={{ flex: 1 }} onLayout={isNavigationReady ? undefined : handleNavigationReady}>
            <AppNavigatorContent />
          </View>
        </RevenueCatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default AppNavigator;
