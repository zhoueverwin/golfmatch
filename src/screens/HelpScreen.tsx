import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import StandardHeader from "../components/StandardHeader";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

type HelpScreenNavigationProp = StackNavigationProp<RootStackParamList, "Help">;

interface HelpCategory {
  id: string;
  title: string;
  items: HelpItem[];
}

interface HelpItem {
  id: string;
  title: string;
}

const helpCategories: HelpCategory[] = [
  {
    id: "profile",
    title: "プロフィール",
    items: [
      { id: "profile-setup", title: "プロフィール項目を設定・変更したい" },
      { id: "main-photo", title: "メイン写真の設定・変更をしたい" },
      { id: "sub-photo", title: "サブ写真の設定・変更をしたい" },
      { id: "photo-review", title: "写真の審査とは?" },
      { id: "email-handling", title: "メールアドレスの取り扱いについて" },
      { id: "email-change", title: "メールアドレスを変更したい" },
      { id: "gender-correction", title: "性別を修正したい" },
      { id: "points-per-round", title: "プロフィールの1ラウンド当たりのポイント設定について" },
      { id: "photo-permission", title: "写真設定時のアクセス権限について" },
    ],
  },
  {
    id: "likes",
    title: "いいね",
    items: [
      { id: "like-send", title: "いいねの送り方" },
      { id: "like-receive", title: "いいねの確認方法" },
      { id: "like-match", title: "マッチングとは?" },
      { id: "like-history", title: "過去のいいねを確認したい" },
      { id: "like-withdraw", title: "いいねを取り消したい" },
    ],
  },
  {
    id: "messages",
    title: "メッセージ",
    items: [
      { id: "message-send", title: "メッセージの送り方" },
      { id: "message-read", title: "メッセージの確認方法" },
      { id: "message-notification", title: "メッセージ通知の設定" },
      { id: "message-delete", title: "メッセージを削除したい" },
      { id: "message-block", title: "ユーザーをブロックしたい" },
    ],
  },
  {
    id: "features",
    title: "機能",
    items: [
      { id: "search-feature", title: "検索機能の使い方" },
      { id: "filter-feature", title: "フィルター機能について" },
      { id: "calendar-feature", title: "カレンダー機能の使い方" },
      { id: "connections-feature", title: "つながり機能について" },
      { id: "footprints-feature", title: "足あと機能について" },
      { id: "store-feature", title: "ストア機能について" },
    ],
  },
  {
    id: "paid-services",
    title: "有料サービス",
    items: [
      { id: "premium-benefits", title: "プレミアム会員の特典" },
      { id: "premium-purchase", title: "プレミアム会員の購入方法" },
      { id: "payment-methods", title: "支払い方法について" },
      { id: "payment-cancel", title: "有料サービスの解約方法" },
      { id: "points-system", title: "ポイントシステムについて" },
    ],
  },
  {
    id: "age-verification",
    title: "年齢確認",
    items: [
      { id: "age-verify-process", title: "年齢確認の手順" },
      { id: "age-verify-required", title: "年齢確認が必要な理由" },
      { id: "age-verify-failed", title: "年齢確認ができない場合" },
    ],
  },
  {
    id: "review",
    title: "審査",
    items: [
      { id: "profile-review", title: "プロフィール審査について" },
      { id: "photo-review-process", title: "写真審査の流れ" },
      { id: "review-time", title: "審査にかかる時間" },
      { id: "review-rejection", title: "審査が通らない場合" },
    ],
  },
  {
    id: "reporting",
    title: "通報報告",
    items: [
      { id: "report-user", title: "ユーザーを通報したい" },
      { id: "report-reason", title: "通報理由の選択方法" },
      { id: "report-handling", title: "通報後の処理について" },
      { id: "report-safety", title: "安全に利用するために" },
    ],
  },
  {
    id: "withdrawal",
    title: "退会",
    items: [
      { id: "withdrawal-process", title: "退会手続きの方法" },
      { id: "withdrawal-data", title: "退会時のデータ取り扱い" },
      { id: "withdrawal-restore", title: "退会を取り消したい" },
    ],
  },
  {
    id: "bugs",
    title: "不具合について",
    items: [
      { id: "bug-report", title: "不具合を報告したい" },
      { id: "bug-common", title: "よくある不具合と対処法" },
      { id: "bug-app-update", title: "アプリの更新方法" },
    ],
  },
  {
    id: "other",
    title: "その他",
    items: [
      { id: "privacy-policy", title: "プライバシーポリシー" },
      { id: "terms-of-service", title: "利用規約" },
      { id: "contact-support", title: "サポートへのお問い合わせ" },
    ],
  },
];

const HelpScreen: React.FC = () => {
  const navigation = useNavigation<HelpScreenNavigationProp>();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleItemPress = (itemId: string) => {
    navigation.navigate("HelpDetail", { itemId });
  };

  const handleContactPress = () => {
    navigation.navigate("ContactReply");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StandardHeader
        title="ヘルプ・お問い合わせ"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {helpCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);

          return (
            <View key={category.id} style={styles.categoryContainer}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.gray[600]}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.itemsContainer}>
                  {category.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.itemRow}
                      onPress={() => handleItemPress(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.itemText}>{item.title}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.contactSection}>
          <Text style={styles.contactText}>ヘルプで解決しない場合</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactPress}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>お問い合わせ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  categoryContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  categoryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.text.primary,
  },
  itemsContainer: {
    backgroundColor: Colors.gray[50],
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  contactSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    alignItems: "center",
  },
  contactText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  contactButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
});

export default HelpScreen;



