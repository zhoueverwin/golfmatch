import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { User } from "../types/dataModels";
import CarouselProfileCard from "./CarouselProfileCard";

interface CarouselSectionProps {
  title: string;
  users: User[];
  loading: boolean;
  onCardPress: (user: User, index: number) => void;
}

const SkeletonCard = () => (
  <View style={styles.skeletonCard} />
);

const CarouselSection: React.FC<CarouselSectionProps> = ({
  title,
  users,
  loading,
  onCardPress,
}) => {
  if (!loading && users.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {loading ? (
        <View style={styles.skeletonRow}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={users}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <CarouselProfileCard
              profile={item}
              onPress={(user) => onCardPress(user, index)}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  skeletonRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  skeletonCard: {
    width: 140,
    height: 190,
    borderRadius: 16,
    backgroundColor: Colors.gray[200],
  },
});

export default CarouselSection;
