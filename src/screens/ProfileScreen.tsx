import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { RootStackParamList } from "../types";
import { DataProvider } from "../services";
import { User } from "../types/dataModels";
import ImageCarousel from "../components/ImageCarousel";
import VideoPlayer from "../components/VideoPlayer";

const { width } = Dimensions.get("window");

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await DataProvider.getUserById(userId);
      
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || "プロフィールの読み込みに失敗しました。");
      }
    } catch (err) {
      setError("プロフィールの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const getSkillLevelText = (level: string): string => {
    switch (level) {
      case "beginner":
        return "ビギナー";
      case "intermediate":
        return "中級者";
      case "advanced":
        return "上級者";
      case "professional":
        return "プロ";
      default:
        return "未設定";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>プロフィールを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || "プロフィールが見つかりません"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Images/Video Carousel */}
        {profile.profile_pictures && profile.profile_pictures.length > 0 && (
          <View style={styles.imageCarouselContainer}>
            <ImageCarousel
              images={profile.profile_pictures}
              height={width * 1.2}
              autoPlay={false}
            />
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={Colors.gray[500]} />
            <Text style={styles.infoText}>
              {profile.prefecture || "未設定"} {profile.age ? `・ ${profile.age}歳` : ""}
            </Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>自己紹介</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Golf Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ゴルフ情報</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>スキルレベル</Text>
              <Text style={styles.infoValue}>
                {getSkillLevelText(profile.golf_skill_level)}
              </Text>
            </View>
            {profile.average_score && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>平均スコア</Text>
                <Text style={styles.infoValue}>{profile.average_score}</Text>
              </View>
            )}
            {profile.best_score && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ベストスコア</Text>
                <Text style={styles.infoValue}>{profile.best_score}</Text>
              </View>
            )}
            {profile.golf_experience && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ゴルフ歴</Text>
                <Text style={styles.infoValue}>{profile.golf_experience}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>
          <View style={styles.infoGrid}>
            {profile.height && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>身長</Text>
                <Text style={styles.infoValue}>{profile.height}</Text>
              </View>
            )}
            {profile.body_type && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>体型</Text>
                <Text style={styles.infoValue}>{profile.body_type}</Text>
              </View>
            )}
            {profile.blood_type && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>血液型</Text>
                <Text style={styles.infoValue}>{profile.blood_type}</Text>
              </View>
            )}
            {profile.personality_type && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>性格</Text>
                <Text style={styles.infoValue}>{profile.personality_type}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Preferences */}
        {(profile.available_days || profile.round_fee || profile.play_fee) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>プレー情報</Text>
            <View style={styles.infoGrid}>
              {profile.available_days && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>プレー可能日</Text>
                  <Text style={styles.infoValue}>{profile.available_days}</Text>
                </View>
              )}
              {profile.round_fee && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>ラウンド頻度</Text>
                  <Text style={styles.infoValue}>{profile.round_fee}</Text>
                </View>
              )}
              {profile.play_fee && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>プレー費用</Text>
                  <Text style={styles.infoValue}>{profile.play_fee}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  imageCarouselContainer: {
    width: width,
    height: width * 1.2,
  },
  section: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  name: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  bioText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.sm,
  },
  infoItem: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});

export default ProfileScreen;
