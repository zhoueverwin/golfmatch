import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { FilterModalProps, SearchFilters } from "../types";

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  // const prefectures = [
  //   '東京都', '神奈川県', '千葉県', '埼玉県', '群馬県', '栃木県', '茨城県',
  //   '大阪府', '京都府', '兵庫県', '奈良県', '滋賀県', '和歌山県',
  //   '愛知県', '静岡県', '岐阜県', '三重県',
  //   '福岡県', '熊本県', '鹿児島県', '沖縄県',
  // ];

  // const skillLevels = [
  //   { value: 'beginner', label: 'ビギナー' },
  //   { value: 'intermediate', label: '中級者' },
  //   { value: 'advanced', label: '上級者' },
  //   { value: 'professional', label: 'プロ' },
  // ];

  const handleClear = () => {
    setFilters({});
  };

  const handleApply = () => {
    onApply(filters);
  };

  const FilterItem = ({
    icon,
    title,
    value,
    onPress,
  }: {
    icon: string;
    title: string;
    value: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.filterItem} onPress={onPress}>
      <View style={styles.filterItemLeft}>
        <Ionicons name={icon as any} size={20} color={Colors.gray[600]} />
        <Text style={styles.filterItemTitle}>{title}</Text>
      </View>
      <View style={styles.filterItemRight}>
        <Text style={styles.filterItemValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>こだわり条件</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearButton}>クリア</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Age Filter */}
          <FilterItem
            icon="calendar-outline"
            title="年齢"
            value={
              filters.age_min && filters.age_max
                ? `${filters.age_min}代前半 ~ ${filters.age_max}代前半`
                : "未指定"
            }
            onPress={() => {
              // TODO: Open age picker modal
              console.log("Age filter pressed");
            }}
          />

          {/* Average Score Filter */}
          <FilterItem
            icon="golf-outline"
            title="平均スコア (以下)"
            value={
              filters.average_score_max
                ? `${filters.average_score_max}以下`
                : "未指定"
            }
            onPress={() => {
              // TODO: Open score picker modal
              console.log("Score filter pressed");
            }}
          />

          {/* Residence Filter */}
          <FilterItem
            icon="location-outline"
            title="居住地"
            value={
              filters.prefecture?.length
                ? `${filters.prefecture.length}件選択`
                : "未指定"
            }
            onPress={() => {
              // TODO: Open prefecture picker modal
              console.log("Prefecture filter pressed");
            }}
          />

          {/* Prefecture Filter */}
          <FilterItem
            icon="map-outline"
            title="都道府県 (複数可)"
            value={
              filters.prefecture?.length
                ? `${filters.prefecture.length}件選択`
                : "未指定"
            }
            onPress={() => {
              // TODO: Open prefecture multi-select modal
              console.log("Prefecture multi-select pressed");
            }}
          />

          {/* Available Round Date Filter */}
          <FilterItem
            icon="calendar-outline"
            title="ラウンド可能日"
            value="未指定"
            onPress={() => {
              // TODO: Open date picker modal
              console.log("Round date filter pressed");
            }}
          />

          {/* Last Login Filter */}
          <FilterItem
            icon="time-outline"
            title="最終ログイン"
            value={
              filters.last_login_days
                ? `${filters.last_login_days}日以内`
                : "未指定"
            }
            onPress={() => {
              // TODO: Open last login picker modal
              console.log("Last login filter pressed");
            }}
          />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>条件を適用</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  clearButton: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
  },
  filterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterItemTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  filterItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterItemValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  actionButtons: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  applyButton: {
    backgroundColor: Colors.primary,
  },
  applyButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  closeButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
});

export default FilterModal;
