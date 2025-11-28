import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

export interface PostMenuModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postUserId: string;
  postUserName: string;
  currentUserId: string;
  onHide?: () => void;
  onBlock: () => void;
  onReport: () => void;
  showHideOption?: boolean; // Default true, set false for user profile menu
}

const PostMenuModal: React.FC<PostMenuModalProps> = ({
  visible,
  onClose,
  postId,
  postUserId,
  postUserName,
  currentUserId,
  onHide,
  onBlock,
  onReport,
  showHideOption = true,
}) => {
  const insets = useSafeAreaInsets();

  // Don't show menu for own posts
  if (postUserId === currentUserId) {
    return null;
  }

  const handleHide = () => {
    onClose();
    onHide?.();
  };

  const handleBlock = () => {
    Alert.alert(
      "ブロック",
      `${postUserName}さんをブロックしますか？ブロックすると、この相手の投稿やメッセージが表示されなくなります。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ブロック",
          style: "destructive",
          onPress: () => {
            onClose();
            onBlock();
          },
        },
      ]
    );
  };

  const handleReport = () => {
    onClose();
    onReport();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.handle} />

              {showHideOption && onHide && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleHide}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye-off-outline" size={24} color={Colors.text.primary} />
                  <Text style={styles.menuText}>非表示</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleBlock}
                activeOpacity={0.7}
              >
                <Ionicons name="ban-outline" size={24} color={Colors.text.primary} />
                <Text style={styles.menuText}>ブロック</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={handleReport}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={24} color={Colors.error} />
                <Text style={[styles.menuText, styles.menuTextDanger]}>通報</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.cancelItem]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray[300],
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary,
    marginLeft: Spacing.md,
  },
  menuTextDanger: {
    color: Colors.error,
  },
  cancelItem: {
    justifyContent: "center",
    marginTop: Spacing.sm,
    borderBottomWidth: 0,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.secondary,
    textAlign: "center",
  },
});

export default PostMenuModal;
