import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import StandardHeader from "../components/StandardHeader";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

type HelpDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "HelpDetail"
>;
type HelpDetailScreenRouteProp = RouteProp<RootStackParamList, "HelpDetail">;

interface HelpDetail {
  id: string;
  title: string;
  description: string;
  steps?: string[];
  additionalInfo?: string;
}

const helpDetails: Record<string, HelpDetail> = {
  "profile-setup": {
    id: "profile-setup",
    title: "プロフィール項目を設定・変更したい",
    description:
      "ゴルマチに登録されたプロフィール情報は、ゴルマチ利用者全体に公開されます。ラウンドのマッチング率をあげるためにもプロフィールの情報を充実させましょう!",
    steps: [
      "画面下部メニューから「マイページ」を選択する",
      "画面上部の「プロフィールの確認」を選択する",
      "プロフィールを編集する画面にて、写真やゴルフに関する情報、プロフィール情報を入力してください。",
    ],
    additionalInfo: "各項目の入力が完了すると、内容が自動的に保存されます。",
  },
  "main-photo": {
    id: "main-photo",
    title: "メイン写真の設定・変更をしたい",
    description:
      "メイン写真は他のユーザーが最初に見る写真です。明るく、はっきりと写った写真を選びましょう。",
    steps: [
      "マイページから「プロフィールの確認」を選択",
      "「プロフィール編集」画面を開く",
      "メイン写真の編集ボタンをタップ",
      "写真を選択または撮影",
      "写真を確認して保存",
    ],
    additionalInfo:
      "メイン写真は顔がはっきり見える写真を推奨します。審査に通過しない場合があります。",
  },
  "sub-photo": {
    id: "sub-photo",
    title: "サブ写真の設定・変更をしたい",
    description:
      "サブ写真は最大5枚まで登録できます。ゴルフのシーンや趣味の写真など、あなたの魅力を伝える写真を追加しましょう。",
    steps: [
      "プロフィール編集画面を開く",
      "サブ写真セクションを確認",
      "写真を追加ボタンをタップ",
      "写真を選択または撮影",
      "写真の順番を変更する場合は、ドラッグ&ドロップで並び替え",
    ],
  },
  "photo-review": {
    id: "photo-review",
    title: "写真の審査とは?",
    description:
      "すべての写真は安全と品質を保つために審査を行っています。審査に通過しない写真は表示されません。",
    additionalInfo:
      "審査の基準: 顔がはっきり見えること、不適切な内容が含まれていないこと、他の人物が写り込んでいないことなど。審査には通常24時間以内にかかります。",
  },
  "email-handling": {
    id: "email-handling",
    title: "メールアドレスの取り扱いについて",
    description:
      "メールアドレスは認証と重要な通知のために使用されます。他のユーザーには公開されません。",
    additionalInfo:
      "メールアドレスはアカウントの安全性を保つために使用されます。パスワードリセットや重要な通知はこのメールアドレスに送信されます。",
  },
  "email-change": {
    id: "email-change",
    title: "メールアドレスを変更したい",
    description: "メールアドレスは設定画面から変更できます。",
    steps: [
      "マイページから「各種設定」を選択",
      "アカウント設定を開く",
      "メールアドレス変更を選択",
      "新しいメールアドレスを入力",
      "確認メールを確認して承認",
    ],
  },
  "gender-correction": {
    id: "gender-correction",
    title: "性別を修正したい",
    description: "性別はプロフィール編集画面から変更できます。",
    steps: [
      "プロフィール編集画面を開く",
      "基本情報セクションを確認",
      "性別の項目を選択",
      "正しい性別を選択して保存",
    ],
  },
  "points-per-round": {
    id: "points-per-round",
    title: "プロフィールの1ラウンド当たりのポイント設定について",
    description:
      "1ラウンド当たりのポイントを設定することで、希望する金額範囲のマッチング相手を見つけやすくなります。",
    steps: [
      "プロフィール編集画面を開く",
      "ゴルフ情報セクションを確認",
      "1ラウンド当たりのポイントを選択",
      "希望する金額範囲を設定",
    ],
  },
  "photo-permission": {
    id: "photo-permission",
    title: "写真設定時のアクセス権限について",
    description:
      "写真を設定するには、端末の写真へのアクセス権限が必要です。",
    steps: [
      "設定アプリを開く",
      "プライバシー > 写真を選択",
      "ゴルマチアプリを選択",
      "アクセス権限を「すべての写真」に設定",
    ],
    additionalInfo:
      "権限が拒否されている場合、アプリ内で設定画面を開くことができます。",
  },
  "like-send": {
    id: "like-send",
    title: "いいねの送り方",
    description:
      "気になる相手に「いいね」を送ることで、マッチングの可能性が広がります。",
    steps: [
      "ホーム画面または検索画面でプロフィールを確認",
      "気になる相手のプロフィールを見る",
      "ハートアイコンをタップして「いいね」を送る",
    ],
  },
  "like-receive": {
    id: "like-receive",
    title: "いいねの確認方法",
    description:
      "自分に送られた「いいね」はマイページで確認できます。",
    steps: [
      "マイページを開く",
      "いいね数のカードを確認",
      "詳細を確認する場合はカードをタップ",
    ],
  },
  "like-match": {
    id: "like-match",
    title: "マッチングとは?",
    description:
      "お互いに「いいね」を送り合うとマッチングが成立します。マッチング後はメッセージのやり取りが可能になります。",
    additionalInfo:
      "マッチングが成立すると通知が届きます。メッセージ画面から会話を始めることができます。",
  },
  "like-history": {
    id: "like-history",
    title: "過去のいいねを確認したい",
    description:
      "過去に送った「いいね」の履歴を確認できます。",
    steps: [
      "マイページを開く",
      "「過去のいいね」メニューを選択",
      "過去のいいね一覧を確認",
    ],
  },
  "like-withdraw": {
    id: "like-withdraw",
    title: "いいねを取り消したい",
    description:
      "送った「いいね」は一定期間内であれば取り消すことができます。",
    steps: [
      "過去のいいね画面を開く",
      "取り消したい「いいね」を見つける",
      "取り消しボタンをタップ",
      "確認して取り消しを実行",
    ],
  },
  "message-send": {
    id: "message-send",
    title: "メッセージの送り方",
    description:
      "マッチングした相手にメッセージを送ることができます。",
    steps: [
      "メッセージ画面を開く",
      "会話相手を選択",
      "メッセージ入力欄にテキストを入力",
      "送信ボタンをタップ",
    ],
  },
  "message-read": {
    id: "message-read",
    title: "メッセージの確認方法",
    description:
      "新しいメッセージは通知で知らせます。アプリ内でも確認できます。",
    steps: [
      "メッセージ画面を開く",
      "未読のメッセージにはバッジが表示されます",
      "会話をタップして内容を確認",
    ],
  },
  "message-notification": {
    id: "message-notification",
    title: "メッセージ通知の設定",
    description:
      "メッセージ通知のオン/オフは設定画面から変更できます。",
    steps: [
      "マイページから「各種設定」を選択",
      "通知設定を開く",
      "メッセージ通知をオン/オフ",
    ],
  },
  "message-delete": {
    id: "message-delete",
    title: "メッセージを削除したい",
    description:
      "不要なメッセージを削除することができます。",
    steps: [
      "メッセージ画面で会話を長押し",
      "削除オプションを選択",
      "確認して削除",
    ],
  },
  "message-block": {
    id: "message-block",
    title: "ユーザーをブロックしたい",
    description:
      "不快なユーザーをブロックすることで、そのユーザーとのメッセージやマッチングを防ぐことができます。",
    steps: [
      "該当ユーザーのプロフィール画面を開く",
      "右上のメニューをタップ",
      "「ブロック」を選択",
      "確認してブロック実行",
    ],
    additionalInfo:
      "ブロックしたユーザーは解除するまでメッセージやマッチングができません。",
  },
  "search-feature": {
    id: "search-feature",
    title: "検索機能の使い方",
    description:
      "検索画面で様々な条件で理想のゴルフパートナーを探すことができます。",
    steps: [
      "画面下部の「さがす」タブを選択",
      "検索条件を設定（年齢、場所、スキルレベルなど）",
      "検索結果を確認",
      "気になるプロフィールをタップして詳細を確認",
    ],
  },
  "filter-feature": {
    id: "filter-feature",
    title: "フィルター機能について",
    description:
      "詳細な検索条件を設定することで、より希望に合う相手を見つけることができます。",
    steps: [
      "検索画面でフィルターボタンをタップ",
      "希望する条件を設定",
      "適用ボタンをタップ",
    ],
  },
  "calendar-feature": {
    id: "calendar-feature",
    title: "カレンダー機能の使い方",
    description:
      "ゴルフをプレイできる日程を設定することで、マッチング率が向上します。",
    steps: [
      "マイページから「カレンダー」を選択",
      "プレイ可能な日付を選択",
      "時間帯を設定",
      "保存",
    ],
  },
  "connections-feature": {
    id: "connections-feature",
    title: "つながり機能について",
    description:
      "つながり画面では、マッチングした相手や相互にいいねを送った相手を確認できます。",
    steps: [
      "画面下部の「つながり」タブを選択",
      "マッチング一覧を確認",
      "各プロフィールをタップして詳細を確認",
    ],
  },
  "footprints-feature": {
    id: "footprints-feature",
    title: "足あと機能について",
    description:
      "あなたのプロフィールを見たユーザーを確認できます。",
    steps: [
      "マイページから「足あと」を選択",
      "閲覧履歴を確認",
      "気になる相手に「いいね」を送る",
    ],
  },
  "store-feature": {
    id: "store-feature",
    title: "ストア機能について",
    description:
      "ストアでは、プレミアム機能やポイントを購入できます。",
    steps: [
      "マイページから「ストア」を選択",
      "希望する商品を選択",
      "購入手続きを進める",
    ],
  },
  "premium-benefits": {
    id: "premium-benefits",
    title: "プレミアム会員の特典",
    description:
      "プレミアム会員になると、以下の特典が利用できます:",
    steps: [
      "無制限のいいね送信",
      "閲覧履歴の詳細確認",
      "優先的なプロフィール表示",
      "広告非表示",
      "特別なマッチング機能",
    ],
  },
  "premium-purchase": {
    id: "premium-purchase",
    title: "プレミアム会員の購入方法",
    description:
      "ストア画面からプレミアム会員を購入できます。",
    steps: [
      "マイページから「ストア」を選択",
      "プレミアム会員プランを選択",
      "支払い方法を選択",
      "購入を完了",
    ],
  },
  "payment-methods": {
    id: "payment-methods",
    title: "支払い方法について",
    description:
      "以下の支払い方法が利用できます:",
    steps: [
      "クレジットカード",
      "デビットカード",
      "アプリ内決済（Google Play/App Store）",
    ],
  },
  "payment-cancel": {
    id: "payment-cancel",
    title: "有料サービスの解約方法",
    description:
      "有料サービスの解約は設定画面から行えます。",
    steps: [
      "マイページから「各種設定」を選択",
      "アカウント設定を開く",
      "有料サービス管理を選択",
      "解約を選択して確認",
    ],
  },
  "points-system": {
    id: "points-system",
    title: "ポイントシステムについて",
    description:
      "ポイントを使用して様々な機能を利用できます。",
    additionalInfo:
      "ポイントはストアから購入できます。いいねを送る際や特別な機能を使用する際にポイントが消費されます。",
  },
  "age-verify-process": {
    id: "age-verify-process",
    title: "年齢確認の手順",
    description:
      "年齢確認は本人確認書類をアップロードして行います。",
    steps: [
      "マイページから「設定」を選択",
      "年齢確認を選択",
      "本人確認書類を撮影",
      "アップロードして送信",
      "審査完了までお待ちください",
    ],
  },
  "age-verify-required": {
    id: "age-verify-required",
    title: "年齢確認が必要な理由",
    description:
      "年齢確認は、18歳以上の方のみが利用できるようにするためのものです。安全で安心して利用していただくために実施しています。",
  },
  "age-verify-failed": {
    id: "age-verify-failed",
    title: "年齢確認ができない場合",
    description:
      "年齢確認ができない場合は、以下の点を確認してください:",
    steps: [
      "書類が鮮明に写っているか確認",
      "書類の有効期限を確認",
      "再度アップロードを試す",
      "それでも解決しない場合はお問い合わせください",
    ],
  },
  "profile-review": {
    id: "profile-review",
    title: "プロフィール審査について",
    description:
      "すべてのプロフィールは安全と品質を保つために審査を行っています。",
    additionalInfo:
      "審査には通常24時間以内にかかります。審査が完了すると通知が届きます。",
  },
  "photo-review-process": {
    id: "photo-review-process",
    title: "写真審査の流れ",
    description:
      "写真をアップロードすると自動的に審査が開始されます。",
    steps: [
      "写真をアップロード",
      "自動審査システムでチェック",
      "問題がない場合は承認",
      "問題がある場合は差し戻し",
      "結果を通知",
    ],
  },
  "review-time": {
    id: "review-time",
    title: "審査にかかる時間",
    description:
      "審査には通常24時間以内にかかります。",
    additionalInfo:
      "混雑時や休日は、審査に時間がかかる場合があります。ご了承ください。",
  },
  "review-rejection": {
    id: "review-rejection",
    title: "審査が通らない場合",
    description:
      "審査が通らない場合は、以下の点を確認してください:",
    steps: [
      "不適切な内容が含まれていないか確認",
      "顔がはっきり見えるか確認",
      "写真の品質を確認",
      "必要に応じて新しい写真をアップロード",
    ],
  },
  "report-user": {
    id: "report-user",
    title: "ユーザーを通報したい",
    description:
      "不適切な行動をしているユーザーを通報できます。",
    steps: [
      "該当ユーザーのプロフィール画面を開く",
      "右上のメニューをタップ",
      "「通報」を選択",
      "通報理由を選択",
      "詳細を入力して送信",
    ],
  },
  "report-reason": {
    id: "report-reason",
    title: "通報理由の選択方法",
    description:
      "通報する際は、適切な理由を選択してください。",
    steps: [
      "迷惑行為",
      "不適切な内容",
      "詐欺・スパム",
      "その他",
    ],
  },
  "report-handling": {
    id: "report-handling",
    title: "通報後の処理について",
    description:
      "通報内容を確認後、適切な処置を行います。",
    additionalInfo:
      "通報後、内容を確認してから対応いたします。結果については通知でお知らせします。",
  },
  "report-safety": {
    id: "report-safety",
    title: "安全に利用するために",
    description:
      "安全にゴルマチを利用するために、以下の点にご注意ください:",
    steps: [
      "個人情報を公開しない",
      "不審な要求には応じない",
      "初めて会う場合は公共の場所で",
      "問題があればすぐに通報",
    ],
  },
  "withdrawal-process": {
    id: "withdrawal-process",
    title: "退会手続きの方法",
    description:
      "退会は設定画面から行えます。",
    steps: [
      "マイページから「各種設定」を選択",
      "アカウント設定を開く",
      "退会を選択",
      "退会理由を選択",
      "確認して退会を実行",
    ],
  },
  "withdrawal-data": {
    id: "withdrawal-data",
    title: "退会時のデータ取り扱い",
    description:
      "退会後、すべてのデータは削除されます。",
    additionalInfo:
      "退会後、プロフィール、メッセージ、マッチング情報などすべてのデータが削除されます。復元はできませんので、ご注意ください。",
  },
  "withdrawal-restore": {
    id: "withdrawal-restore",
    title: "退会を取り消したい",
    description:
      "退会後30日以内であれば、アカウントを復元できます。",
    steps: [
      "アプリにログイン",
      "アカウント復元の案内を確認",
      "復元を選択",
      "確認して復元実行",
    ],
  },
  "bug-report": {
    id: "bug-report",
    title: "不具合を報告したい",
    description:
      "不具合を発見した場合は、お問い合わせ画面から報告してください。",
    steps: [
      "マイページから「お問い合わせと返信」を選択",
      "「送信」タブを選択",
      "問い合わせ種類で「不具合・バグ報告」を選択",
      "不具合の詳細を入力",
      "送信",
    ],
  },
  "bug-common": {
    id: "bug-common",
    title: "よくある不具合と対処法",
    description:
      "よくある不具合とその対処法をご紹介します:",
    steps: [
      "アプリが起動しない → アプリを再起動",
      "写真が表示されない → インターネット接続を確認",
      "通知が来ない → 通知設定を確認",
      "ログインできない → パスワードをリセット",
    ],
  },
  "bug-app-update": {
    id: "bug-app-update",
    title: "アプリの更新方法",
    description:
      "アプリは定期的に更新されます。最新版を使用することで、不具合が解消される場合があります。",
    steps: [
      "App StoreまたはGoogle Playを開く",
      "マイアプリを検索",
      "更新がある場合は更新ボタンをタップ",
      "更新完了を待つ",
    ],
  },
  "privacy-policy": {
    id: "privacy-policy",
    title: "プライバシーポリシー",
    description:
      "プライバシーポリシーについては、アプリ内の設定画面から確認できます。",
    additionalInfo:
      "お客様の個人情報は適切に管理され、第三者に提供されることはありません。詳細はプライバシーポリシーをご確認ください。",
  },
  "terms-of-service": {
    id: "terms-of-service",
    title: "利用規約",
    description:
      "利用規約については、アプリ内の設定画面から確認できます。",
    additionalInfo:
      "ゴルマチをご利用いただく際は、利用規約に同意していただく必要があります。",
  },
  "contact-support": {
    id: "contact-support",
    title: "サポートへのお問い合わせ",
    description:
      "サポートへのお問い合わせは、お問い合わせ画面から行えます。",
    steps: [
      "マイページから「お問い合わせと返信」を選択",
      "問い合わせ内容を入力",
      "送信",
    ],
  },
};

const HelpDetailScreen: React.FC = () => {
  const navigation = useNavigation<HelpDetailScreenNavigationProp>();
  const route = useRoute<HelpDetailScreenRouteProp>();
  const { itemId } = route.params;

  const detail = helpDetails[itemId];

  if (!detail) {
    return (
      <SafeAreaView style={styles.container}>
        <StandardHeader
          title="ヘルプ"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>ヘルプ情報が見つかりませんでした</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.content}>
          <Text style={styles.title}>{detail.title}</Text>

          <Text style={styles.description}>{detail.description}</Text>

          {detail.steps && detail.steps.length > 0 && (
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>■手順</Text>
              {detail.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <Text style={styles.stepNumber}>{index + 1}:</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {detail.additionalInfo && (
            <Text style={styles.additionalInfo}>{detail.additionalInfo}</Text>
          )}
        </View>

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
  content: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  stepsContainer: {
    marginBottom: Spacing.lg,
  },
  stepsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  stepNumber: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    marginRight: Spacing.xs,
    minWidth: 24,
  },
  stepText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  additionalInfo: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 24,
    marginTop: Spacing.md,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
});

export default HelpDetailScreen;








