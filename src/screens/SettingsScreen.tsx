import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { RootStackParamList } from "../types";
import { useAuth } from "../contexts/AuthContext";
import StandardHeader from "../components/StandardHeader";

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Settings"
>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    const result = await signOut();
    if (!result.success) {
      console.error("Sign out error:", result.error);
    }
  };

  const handleLinkAccount = () => {
    navigation.navigate("LinkAccount");
  };

  const handleNotificationSettings = () => {
    navigation.navigate("NotificationSettings");
  };

  const settingsItems = [
    {
      id: "account",
      title: "アカウント連携",
      subtitle: "認証方法の管理",
      icon: "link" as keyof typeof Ionicons.glyphMap,
      onPress: handleLinkAccount,
    },
    {
      id: "notifications",
      title: "通知設定",
      subtitle: "プッシュ通知の管理",
      icon: "notifications" as keyof typeof Ionicons.glyphMap,
      onPress: handleNotificationSettings,
    },
    {
      id: "privacy",
      title: "プライバシー",
      subtitle: "プライバシー設定",
      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: "help",
      title: "ヘルプ",
      subtitle: "サポートとFAQ",
      icon: "help-circle" as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: "about",
      title: "アプリについて",
      subtitle: "バージョン情報",
      icon: "information-circle" as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StandardHeader
        title="各種設定"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.section}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.settingItem}
              onPress={item.onPress}
            >
              <View style={styles.settingItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon} size={24} color={Colors.primary} />
                </View>
                <View style={styles.settingItemText}>
                  <Text style={styles.settingItemTitle}>{item.title}</Text>
                  <Text style={styles.settingItemSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.gray[400]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={24} color={Colors.error} />
            <Text style={styles.signOutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: 32,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.text.primary,
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    gap: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.error,
  },
});

export default SettingsScreen;
