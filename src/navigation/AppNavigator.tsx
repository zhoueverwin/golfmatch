import React, { useEffect, useRef, useCallback, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View, Image, Animated, Text } from "react-native";

import { Colors } from "../constants/colors";
import { RootStackParamList, MainTabParamList } from "../types";
import ErrorBoundary from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { MatchProvider } from "../contexts/MatchContext";
import { ScrollProvider, useScroll } from "../contexts/ScrollContext";
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
import HelpScreen from "../screens/HelpScreen";
import HelpDetailScreen from "../screens/HelpDetailScreen";

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom tab bar component with scroll-based opacity
const CustomTabBar = (props: BottomTabBarProps) => {
  const { navBarOpacity } = useScroll();
  const { insets } = props;
  const animatedOpacity = useRef(new Animated.Value(navBarOpacity)).current;
  const tabBarHeight = 65;

  useEffect(() => {
    Animated.timing(animatedOpacity, {
      toValue: navBarOpacity,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [navBarOpacity]);

  const currentRouteName = props.state.routes[props.state.index]?.name;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom * 0.5, 4),
        backgroundColor:
          currentRouteName === "Home"
            ? "rgba(255,255,255,1)"
            : animatedOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
              }),
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
    </Animated.View>
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
  const hasCheckedNewUser = useRef(false);
  const profileCheckPassed = useRef(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

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
      profile.golf?.play_fee,
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

    // If user exists but profileId is null after retries, redirect to setup
    if (user && !profileId) {
      // Wait a bit more for profile creation, then redirect
      setTimeout(() => {
        // Don't redirect if profile check has already passed
        if (profileCheckPassed.current) {
          return;
        }
        if (navigationRef.current?.isReady() && !profileCheckPassed.current) {
          hasCheckedNewUser.current = true;
          navigationRef.current?.navigate("EditProfile");
        }
      }, 2000); // Wait 2 seconds for profile creation
      return;
    }

    // If profileId is still null, don't proceed (shouldn't reach here after retries)
    if (!profileId) {
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
        const profile = response.data;
        const completion = calculateProfileCompletion(profile);
        
        // Check if user has edited essential fields (indicating they've completed initial setup)
        // Essential fields: name, age > 0, gender, prefecture != '未設定'
        const hasName = !!profile.basic?.name;
        const hasAge = !!profile.basic?.age && parseInt(profile.basic.age.toString()) > 0;
        const hasGender = !!profile.basic?.gender;
        const hasPrefecture = !!profile.basic?.prefecture && profile.basic.prefecture !== '未設定';
        
        const hasEssentialFields = hasName && hasAge && hasGender && hasPrefecture;
        
        // Only redirect if:
        // 1. Profile completion is less than 30% AND
        // 2. Essential fields are not filled (user hasn't completed initial setup)
        if (completion < 30 && !hasEssentialFields) {
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            navigationRef.current?.navigate("EditProfile");
          }, 500);
        } else {
          // Mark profile check as passed to prevent other redirects
          profileCheckPassed.current = true;
        }
      } else if (!response.success) {
        // Profile might not exist yet, redirect to EditProfile to create it
        setTimeout(() => {
          navigationRef.current?.navigate("EditProfile");
        }, 500);
      }
    } catch (error) {
      console.error("Error checking new user profile:", error);
      // On error, don't redirect - let user proceed normally
      // Only redirect if we're certain the profile doesn't exist
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
      <ScrollProvider>
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
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                headerShown: false,
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
          </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
          </MatchProvider>
        </NotificationProvider>
      </ScrollProvider>
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
        <View style={{ flex: 1 }} onLayout={isNavigationReady ? undefined : handleNavigationReady}>
          <AppNavigatorContent />
        </View>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default AppNavigator;
