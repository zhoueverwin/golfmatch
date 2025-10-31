import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { RootStackParamList, MainTabParamList } from "../types";
import ErrorBoundary from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { MatchProvider } from "../contexts/MatchContext";

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
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Will show loading screen from AuthProvider
  }

  return (
    <NavigationContainer>
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
