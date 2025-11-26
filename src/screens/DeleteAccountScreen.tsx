import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

type DeleteAccountScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DeleteAccount"
>;

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<DeleteAccountScreenNavigationProp>();
  const { deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const CONFIRM_WORD = "退会する";

  const handleInputFocus = () => {
    // Scroll to make the input visible above the keyboard
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== CONFIRM_WORD) {
      Alert.alert(
        "確認",
        `「${CONFIRM_WORD}」と入力してください`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "最終確認",
      "本当にアカウントを削除しますか？\n\nこの操作は取り消せません。すべてのデータが完全に削除されます。",
      [
        {
          text: "キャンセル",
          style: "cancel",
        },
        {
          text: "削除する",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await deleteAccount();
              if (!result.success) {
                Alert.alert(
                  "エラー",
                  result.error || "アカウントの削除に失敗しました",
                  [{ text: "OK" }]
                );
              }
              // If successful, the auth state change will automatically navigate to login
            } catch (error) {
              Alert.alert(
                "エラー",
                "アカウントの削除に失敗しました。しばらくしてからもう一度お試しください。",
                [{ text: "OK" }]
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StandardHeader
        title="退会"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.warningSection}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={48} color={Colors.error} />
          </View>
          <Text style={styles.warningTitle}>アカウントを削除しますか？</Text>
          <Text style={styles.warningDescription}>
            アカウントを削除すると、以下のデータがすべて削除されます。この操作は取り消すことができません。
          </Text>
        </View>

        <View style={styles.dataListSection}>
          <Text style={styles.sectionTitle}>削除されるデータ</Text>
          <View style={styles.dataItem}>
            <Ionicons name="person" size={20} color={Colors.text.secondary} />
            <Text style={styles.dataItemText}>プロフィール情報</Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="heart" size={20} color={Colors.text.secondary} />
            <Text style={styles.dataItemText}>いいね・マッチング履歴</Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="chatbubbles" size={20} color={Colors.text.secondary} />
            <Text style={styles.dataItemText}>メッセージ履歴</Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="images" size={20} color={Colors.text.secondary} />
            <Text style={styles.dataItemText}>投稿・写真</Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="calendar" size={20} color={Colors.text.secondary} />
            <Text style={styles.dataItemText}>カレンダー・予定</Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="notifications" size={20} color={Colors.text.secondary} />
            <Text style={styles.dataItemText}>通知設定・履歴</Text>
          </View>
        </View>

        <View style={styles.confirmSection}>
          <Text style={styles.confirmLabel}>
            退会を確認するには「{CONFIRM_WORD}」と入力してください
          </Text>
          <TextInput
            ref={inputRef}
            style={styles.confirmInput}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={Colors.gray[400]}
            value={confirmText}
            onChangeText={setConfirmText}
            editable={!isDeleting}
            onFocus={handleInputFocus}
          />
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              confirmText !== CONFIRM_WORD && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={confirmText !== CONFIRM_WORD || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="trash" size={20} color={Colors.white} />
                <Text style={styles.deleteButtonText}>アカウントを削除</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isDeleting}
          >
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  warningSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Typography.getFontFamily("700"),
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  warningDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  dataListSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.text.primary,
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  dataItemText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 12,
  },
  confirmSection: {
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  confirmInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  buttonSection: {
    gap: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
    padding: 16,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.white,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.text.secondary,
  },
});

export default DeleteAccountScreen;
