import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import Card from "../components/Card";
import Button from "../components/Button";
import Loading from "../components/Loading";
import { DataProvider } from "../services";

interface ProfileFormData {
  name: string;
  age: string;
  prefecture: string;
  golf_skill_level: string;
  average_score: string;
  bio: string;
  golf_experience: string;
  transportation: string;
  play_fee: string;
  available_days: string;
  blood_type: string;
  height: string;
  body_type: string;
  smoking: string;
  profile_pictures: string[];
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { profileId } = useAuth(); // Get current user's profile ID
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    age: "",
    prefecture: "",
    golf_skill_level: "",
    average_score: "",
    bio: "",
    golf_experience: "",
    transportation: "",
    play_fee: "",
    available_days: "",
    blood_type: "",
    height: "",
    body_type: "",
    smoking: "",
    profile_pictures: [],
  });

  useEffect(() => {
    loadCurrentProfile();
  }, []);

  const loadCurrentProfile = async () => {
    try {
      // Get current user ID from AuthContext
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      
      if (!currentUserId) {
        console.error("No authenticated user found");
        Alert.alert("Error", "Please sign in to edit your profile");
        navigation.goBack();
        return;
      }

      // Load current user profile from centralized data provider
      const response = await DataProvider.getUserProfile(currentUserId);

      if (response.error || !response.data) {
        console.error("Failed to load profile:", response.error);
        Alert.alert("Error", "Failed to load profile");
        setLoading(false);
        return;
      }

      const profile = response.data;

      // Convert profile data to form data format
      const currentProfile: ProfileFormData = {
        name: profile.basic?.name || "",
        age: profile.basic?.age || "",
        prefecture: profile.basic?.prefecture || "",
        golf_skill_level: profile.golf?.skill_level || "",
        average_score: profile.golf?.average_score || "",
        bio: profile.bio || "",
        golf_experience: profile.golf?.experience || "",
        transportation: profile.golf?.transportation || "",
        play_fee: profile.golf?.play_fee || "",
        available_days: profile.golf?.available_days || "",
        blood_type: profile.basic?.blood_type || "",
        height: profile.basic?.height || "",
        body_type: profile.basic?.body_type || "",
        smoking: profile.basic?.smoking || "",
        profile_pictures: profile.profile_pictures || [],
      };

      setFormData(currentProfile);
    } catch (_error) {
      console.error("Error loading profile:", _error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof ProfileFormData,
    value: string | string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoChange = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["キャンセル", "カメラで撮影", "ライブラリから選択"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          }
        },
      );
    } else {
      Alert.alert("写真を選択", "写真の選択方法を選んでください", [
        { text: "キャンセル", style: "cancel" },
        { text: "カメラで撮影", onPress: openCamera },
        { text: "ライブラリから選択", onPress: openImageLibrary },
      ]);
    }
  };

  const openCamera = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("エラー", "カメラの使用許可が必要です");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newProfilePictures = [
          result.assets[0].uri,
          ...formData.profile_pictures.slice(1),
        ];
        handleInputChange("profile_pictures", newProfilePictures);
      }
    } catch (_error) {
      Alert.alert("エラー", "写真の撮影に失敗しました");
    }
  };

  const openImageLibrary = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("エラー", "ライブラリの使用許可が必要です");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newProfilePictures = [
          result.assets[0].uri,
          ...formData.profile_pictures.slice(1),
        ];
        handleInputChange("profile_pictures", newProfilePictures);
      }
    } catch (_error) {
      Alert.alert("エラー", "写真の選択に失敗しました");
    }
  };

  const handleSave = async () => {
    setSaving(true);

    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert("エラー", "名前を入力してください");
      setSaving(false);
      return;
    }

    if (!formData.age.trim()) {
      Alert.alert("エラー", "年齢を入力してください");
      setSaving(false);
      return;
    }

    try {
      // Save profile data to centralized data provider
      const updateData = {
        basic: {
          name: formData.name,
          age: formData.age,
          prefecture: formData.prefecture,
          blood_type: formData.blood_type,
          height: formData.height,
          body_type: formData.body_type,
          smoking: formData.smoking,
          favorite_club: "アイアン", // Keep existing value
          personality_type: "ENFP - 広報運動家型", // Keep existing value
        },
        golf: {
          experience: formData.golf_experience,
          skill_level: formData.golf_skill_level,
          average_score: formData.average_score,
          best_score: "88", // Keep existing value
          transportation: formData.transportation,
          play_fee: formData.play_fee,
          available_days: formData.available_days,
          round_fee: "¥8000", // Keep existing value
        },
        bio: formData.bio,
        profile_pictures: formData.profile_pictures,
        status: "アクティブ", // Keep existing value
        location: `${formData.prefecture} ${formData.age}`, // Update location
      };

      const response = await DataProvider.updateUserProfile(
        "current_user",
        updateData,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      Alert.alert("保存完了", "プロフィールが正常に更新されました", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (_error) {
      Alert.alert("エラー", "保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert("変更を破棄", "変更内容が失われます。よろしいですか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "破棄",
        style: "destructive",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const renderInputField = (
    label: string,
    field: keyof ProfileFormData,
    placeholder: string,
    multiline = false,
  ) => (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.multilineInput]}
        value={typeof formData[field] === "string" ? formData[field] : ""}
        onChangeText={(value) => handleInputChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray[400]}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

  const renderSelectField = (
    label: string,
    field: keyof ProfileFormData,
    options: string[],
  ) => (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.selectContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.selectOption,
              formData[field] === option && styles.selectedOption,
            ]}
            onPress={() => handleInputChange(field, option)}
          >
            <Text
              style={[
                styles.selectOptionText,
                formData[field] === option && styles.selectedOptionText,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading text="プロフィールを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>プロフィール編集</Text>

          <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
            <Text style={[styles.saveText, saving && styles.savingText]}>
              {saving ? "保存中..." : "保存"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo Section */}
          <Card style={styles.photoCard} shadow="small">
            <View style={styles.photoSection}>
              <Image
                source={{
                  uri:
                    formData.profile_pictures.length > 0
                      ? formData.profile_pictures[0]
                      : "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
                }}
                style={styles.profilePhoto}
              />
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={handlePhotoChange}
              >
                <Ionicons name="camera" size={20} color={Colors.primary} />
                <Text style={styles.changePhotoText}>写真を変更</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Basic Information */}
          <Card style={styles.sectionCard} shadow="small">
            <Text style={styles.sectionTitle}>基本情報</Text>

            {renderInputField("名前", "name", "名前を入力してください")}
            {renderInputField("年齢", "age", "年齢を入力してください")}

            {renderSelectField("居住地", "prefecture", [
              "北海道",
              "青森県",
              "岩手県",
              "宮城県",
              "秋田県",
              "山形県",
              "福島県",
              "茨城県",
              "栃木県",
              "群馬県",
              "埼玉県",
              "千葉県",
              "東京都",
              "神奈川県",
              "新潟県",
              "富山県",
              "石川県",
              "福井県",
              "山梨県",
              "長野県",
              "岐阜県",
              "静岡県",
              "愛知県",
              "三重県",
              "滋賀県",
              "京都府",
              "大阪府",
              "兵庫県",
              "奈良県",
              "和歌山県",
              "鳥取県",
              "島根県",
              "岡山県",
              "広島県",
              "山口県",
              "徳島県",
              "香川県",
              "愛媛県",
              "高知県",
              "福岡県",
              "佐賀県",
              "長崎県",
              "熊本県",
              "大分県",
              "宮崎県",
              "鹿児島県",
              "沖縄県",
            ])}

            {renderSelectField("血液型", "blood_type", [
              "A型",
              "B型",
              "O型",
              "AB型",
            ])}
            {renderInputField("身長 (cm)", "height", "身長を入力してください")}

            {renderSelectField("体型", "body_type", [
              "やせ型",
              "普通",
              "ぽっちゃり",
              "筋肉質",
            ])}
            {renderSelectField("タバコ", "smoking", [
              "吸わない",
              "吸う",
              "時々吸う",
            ])}
          </Card>

          {/* Golf Profile */}
          <Card style={styles.sectionCard} shadow="small">
            <Text style={styles.sectionTitle}>ゴルフプロフィール</Text>

            {renderInputField("ゴルフ歴", "golf_experience", "例: 2年")}

            {renderSelectField("ゴルフレベル", "golf_skill_level", [
              "ビギナー",
              "中級者",
              "上級者",
              "プロ",
            ])}

            {renderInputField("平均スコア", "average_score", "例: 120-130台")}

            {renderSelectField("移動手段", "transportation", [
              "送迎不要",
              "送迎希望",
              "どちらでも可",
            ])}

            {renderSelectField("プレイフィー", "play_fee", [
              "相手に出してほしい",
              "自分で支払う",
              "割り勘",
              "どちらでも可",
            ])}

            {renderSelectField("ラウンド可能日", "available_days", [
              "平日",
              "週末",
              "不定期",
              "いつでも",
            ])}
          </Card>

          {/* Bio Section */}
          <Card style={styles.sectionCard} shadow="small">
            <Text style={styles.sectionTitle}>自己紹介</Text>
            {renderInputField(
              "自己紹介",
              "bio",
              "あなたについて教えてください...",
              true,
            )}
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="保存"
              onPress={handleSave}
              variant="primary"
              size="large"
              loading={saving}
              fullWidth
            />

            <Button
              title="キャンセル"
              onPress={handleCancel}
              variant="outline"
              size="large"
              fullWidth
              style={styles.cancelButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
  },
  saveText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  savingText: {
    color: Colors.gray[500],
  },
  scrollView: {
    flex: 1,
  },
  photoCard: {
    margin: Spacing.md,
  },
  photoSection: {
    alignItems: "center",
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
  },
  changePhotoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  inputField: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  multilineInput: {
    height: 100,
    paddingTop: Spacing.sm,
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  selectedOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectOptionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  selectedOptionText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  actionButtons: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
});

export default EditProfileScreen;
