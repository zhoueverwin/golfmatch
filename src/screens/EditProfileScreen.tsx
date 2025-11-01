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
  ActivityIndicator,
  Modal,
  FlatList,
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
import { storageService } from "../services/storageService";

interface ProfileFormData {
  name: string;
  age: string;
  gender: string;
  prefecture: string;
  golf_skill_level: string;
  average_score: string;
  bio: string;
  golf_experience: string;
  best_score: string;
  transportation: string;
  play_fee: string;
  available_days: string;
  round_fee: string;
  blood_type: string;
  height: string;
  body_type: string;
  smoking: string;
  favorite_club: string;
  personality_type: string;
  profile_pictures: string[];
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { profileId } = useAuth(); // Get current user's profile ID
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalOptions, setModalOptions] = useState<string[]>([]);
  const [modalField, setModalField] = useState<keyof ProfileFormData | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    age: "",
    gender: "",
    prefecture: "",
    golf_skill_level: "",
    average_score: "",
    bio: "",
    golf_experience: "",
    best_score: "",
    transportation: "",
    play_fee: "",
    available_days: "",
    round_fee: "",
    blood_type: "",
    height: "",
    body_type: "",
    smoking: "",
    favorite_club: "",
    personality_type: "",
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
      // Handle existing users who may not have filled required fields intelligently
      const currentProfile: ProfileFormData = {
        name: profile.basic?.name?.trim() || "",
        age: profile.basic?.age?.toString().trim() || "",
        // For existing users without gender, leave empty so they must select
        gender: profile.basic?.gender?.trim() || "",
        prefecture: profile.basic?.prefecture?.trim() || "",
        golf_skill_level: profile.golf?.skill_level || "",
        average_score: profile.golf?.average_score || "",
        bio: profile.bio || "",
        golf_experience: profile.golf?.experience || "",
        best_score: profile.golf?.best_score || "",
        transportation: profile.golf?.transportation || "",
        play_fee: profile.golf?.play_fee || "",
        available_days: profile.golf?.available_days || "",
        round_fee: profile.golf?.round_fee || "",
        blood_type: profile.basic?.blood_type || "",
        height: profile.basic?.height || "",
        body_type: profile.basic?.body_type || "",
        smoking: profile.basic?.smoking || "",
        favorite_club: profile.basic?.favorite_club || "",
        personality_type: profile.basic?.personality_type || "",
        profile_pictures: profile.profile_pictures || [],
      };

      setFormData(currentProfile);
    } catch (_error) {
      console.error("Error loading profile:", _error);
    } finally {
      setLoading(false);
    }
  };

  // Gender mapping for display
  const genderLabels: Record<string, string> = {
    male: "男性",
    female: "女性",
    other: "その他",
  };

  const getGenderDisplayLabel = (value: string): string => {
    return genderLabels[value] || value;
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
    const missingFields: string[] = [];
    
    if (!formData.name.trim()) {
      missingFields.push("名前");
    }

    if (!formData.age.trim()) {
      missingFields.push("年齢");
    }

    if (!formData.gender.trim()) {
      missingFields.push("性別");
    }

    if (!formData.prefecture.trim()) {
      missingFields.push("居住地");
    }

    if (missingFields.length > 0) {
      Alert.alert(
        "必須項目が未入力です",
        `以下の項目を入力してください：\n${missingFields.join("、")}`,
        [{ text: "OK" }]
      );
      setSaving(false);
      return;
    }

    try {
      // Get the actual authenticated user ID
      const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
      
      if (!currentUserId) {
        throw new Error("No authenticated user ID available");
      }

      // Upload local images to Supabase Storage before saving
      let uploadedProfilePictures = [...formData.profile_pictures];
      const localImages = formData.profile_pictures.filter(uri => uri.startsWith('file://'));
      
      if (localImages.length > 0) {
        console.log(`Uploading ${localImages.length} profile images to Supabase Storage...`);
        
        for (let i = 0; i < localImages.length; i++) {
          const localUri = localImages[i];
          const index = formData.profile_pictures.indexOf(localUri);
          
          try {
            const { url, error } = await storageService.uploadFile(
              localUri,
              currentUserId,
              'image'
            );

            if (error) {
              console.error(`Failed to upload image ${i + 1}:`, error);
              Alert.alert("エラー", `画像${i + 1}のアップロードに失敗しました: ${error}`);
              setSaving(false);
              return;
            }

            if (url) {
              // Replace local URI with uploaded URL
              uploadedProfilePictures[index] = url;
              console.log(`Image ${i + 1} uploaded successfully:`, url);
            }
          } catch (error: any) {
            console.error(`Error uploading image ${i + 1}:`, error);
            Alert.alert("エラー", `画像のアップロード中にエラーが発生しました`);
            setSaving(false);
            return;
          }
        }
      }

      // Save profile data to centralized data provider
      const updateData = {
        basic: {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          prefecture: formData.prefecture,
          blood_type: formData.blood_type,
          height: formData.height,
          body_type: formData.body_type,
          smoking: formData.smoking,
          favorite_club: formData.favorite_club,
          personality_type: formData.personality_type,
        },
        golf: {
          experience: formData.golf_experience,
          skill_level: formData.golf_skill_level, // Save Japanese value directly to DB
          average_score: formData.average_score,
          best_score: formData.best_score,
          transportation: formData.transportation,
          play_fee: formData.play_fee,
          available_days: formData.available_days,
          round_fee: formData.round_fee,
        },
        bio: formData.bio,
        profile_pictures: uploadedProfilePictures, // Use uploaded URLs instead of local paths
        status: "アクティブ",
        location: `${formData.prefecture} ${formData.age}`,
      };

      console.log("Updating profile for user ID:", currentUserId);
      
      const response = await DataProvider.updateUserProfile(
        currentUserId,
        updateData,
      );

      if (response.error) {
        console.error("Profile update error:", response.error);
        throw new Error(response.error);
      }

      Alert.alert("保存完了", "プロフィールが正常に更新されました", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (_error) {
      console.error("Save error:", _error);
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
    required = false,
  ) => (
    <View style={styles.inputField}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {required && <Text style={styles.requiredIndicator}>*</Text>}
      </View>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          required && !formData[field] && styles.requiredInput,
        ]}
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
    required = false,
    displayLabels?: Record<string, string>,
  ) => (
    <View style={styles.inputField}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {required && <Text style={styles.requiredIndicator}>*</Text>}
      </View>
      <View style={styles.selectContainer}>
        {options.map((option) => {
          const displayText = displayLabels ? (displayLabels[option] || option) : option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.selectOption,
                formData[field] === option && styles.selectedOption,
                required && !formData[field] && styles.requiredSelectOption,
              ]}
              onPress={() => {
                // Double-tap to unselect: if already selected, clear it
                if (formData[field] === option) {
                  handleInputChange(field, "");
                } else {
                  handleInputChange(field, option);
                }
              }}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  formData[field] === option && styles.selectedOptionText,
                ]}
              >
                {displayText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {required && !formData[field] && (
        <Text style={styles.requiredHint}>この項目は必須です</Text>
      )}
    </View>
  );

  // New: Modal picker for long lists (prefecture, personality type)
  const renderModalSelectField = (
    label: string,
    field: keyof ProfileFormData,
    options: string[],
    required = false,
  ) => {
    // For gender modal, show Japanese labels
    const displayValue = field === "gender" && formData[field] 
      ? getGenderDisplayLabel(formData[field])
      : formData[field];
    
    return (
      <View style={styles.inputField}>
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>{label}</Text>
          {required && <Text style={styles.requiredIndicator}>*</Text>}
        </View>
        <TouchableOpacity
          style={[
            styles.modalSelectButton,
            required && !formData[field] && styles.requiredSelectButton,
          ]}
          onPress={() => {
            setModalTitle(label);
            setModalOptions(options);
            setModalField(field);
            setModalVisible(true);
          }}
        >
          <Text style={[
            styles.modalSelectText,
            !formData[field] && styles.modalSelectPlaceholder
          ]}>
            {displayValue || `${label}を選択してください`}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.gray[500]} />
        </TouchableOpacity>
        {required && !formData[field] && (
          <Text style={styles.requiredHint}>この項目は必須です</Text>
        )}
      </View>
    );
  };

  const handleModalSelect = (value: string) => {
    if (modalField) {
      // Double-tap to unselect: if already selected, clear it
      if (formData[modalField] === value) {
        handleInputChange(modalField, "");
      } else {
        handleInputChange(modalField, value);
      }
    }
    setModalVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading text="プロフィールを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="EDIT_PROFILE_SCREEN.ROOT">
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          testID="EDIT_PROFILE_SCREEN.CANCEL_BTN"
          style={styles.headerButton} 
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>プロフィール編集</Text>

        <TouchableOpacity 
          testID="EDIT_PROFILE_SCREEN.HEADER_SAVE_BTN"
          style={styles.headerButton} 
          onPress={handleSave}
        >
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

            {renderInputField("名前", "name", "名前を入力してください", false, true)}
            {renderInputField("年齢", "age", "年齢を入力してください", false, true)}
            
            {renderSelectField("性別", "gender", [
              "male",
              "female",
              "other",
            ], true, genderLabels)}

            {renderModalSelectField("居住地", "prefecture", [
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
            ], true)}

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
            
            {renderSelectField("好きなクラブ", "favorite_club", [
              "ドライバー",
              "フェアウェイウッド",
              "ユーティリティ",
              "アイアン",
              "ウェッジ",
              "パター",
            ])}
            
            {renderModalSelectField("16 パーソナリティ", "personality_type", [
              "INTJ - 建築家",
              "INTP - 論理学者",
              "ENTJ - 指揮官",
              "ENTP - 討論者",
              "INFJ - 提唱者",
              "INFP - 仲介者",
              "ENFJ - 主人公",
              "ENFP - 広報運動家",
              "ISTJ - 管理者",
              "ISFJ - 擁護者",
              "ESTJ - 幹部",
              "ESFJ - 領事官",
              "ISTP - 巨匠",
              "ISFP - 冒険家",
              "ESTP - 起業家",
              "ESFP - エンターテイナー",
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
            {/* Note: Values match database constraint (Japanese) */}

            {renderInputField("平均スコア", "average_score", "例: 120-130台")}
            {renderInputField("ベストスコア", "best_score", "例: 88")}

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
            
            {renderInputField(
              "ラウンド料金",
              "round_fee",
              "例: ¥8000",
            )}
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
              testID="EDIT_PROFILE_SCREEN.SAVE_BTN"
              title="保存"
              onPress={handleSave}
              variant="primary"
              size="large"
              loading={saving}
              fullWidth
            />

            <Button
              testID="EDIT_PROFILE_SCREEN.CANCEL_BOTTOM_BTN"
              title="キャンセル"
              onPress={handleCancel}
              variant="outline"
              size="large"
              fullWidth
              style={styles.cancelButton}
            />
          </View>
        </ScrollView>

        {/* Modal Picker for Long Lists */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={modalOptions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  // Show Japanese labels for gender options in modal
                  const displayText = modalField === "gender" 
                    ? getGenderDisplayLabel(item)
                    : item;
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        modalField && formData[modalField] === item && styles.modalOptionSelected,
                      ]}
                      onPress={() => handleModalSelect(item)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          modalField && formData[modalField] === item && styles.modalOptionTextSelected,
                        ]}
                      >
                        {displayText}
                      </Text>
                      {modalField && formData[modalField] === item && (
                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={true}
              />
            </View>
          </View>
        </Modal>
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
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[600],
  },
  saveText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.primary,
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
    fontFamily: Typography.fontFamily.regular,
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
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  inputField: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  requiredIndicator: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.error,
    marginLeft: Spacing.xs,
  },
  requiredHint: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  requiredInput: {
    borderColor: Colors.error,
  },
  requiredSelectOption: {
    borderColor: Colors.error,
  },
  requiredSelectButton: {
    borderColor: Colors.error,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
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
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
  },
  selectedOptionText: {
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.white,
  },
  actionButtons: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
  // Modal select field styles
  modalSelectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  modalSelectText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    flex: 1,
  },
  modalSelectPlaceholder: {
    color: Colors.gray[400],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primary + "10", // 10% opacity
  },
  modalOptionText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    flex: 1,
  },
  modalOptionTextSelected: {
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.primary,
  },
});

export default EditProfileScreen;
