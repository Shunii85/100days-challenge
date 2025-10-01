import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, ListRenderItem, StyleSheet } from "react-native";
import { Divider, FAB, List } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { addMemo, fetchMemos, Memo } from "../db/database";

export default function HomeScreen() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const router = useRouter();
  const { right, bottom } = useSafeAreaInsets();

  useFocusEffect(() => {
    (async () => {
      try {
        const memosData = await fetchMemos();
        setMemos(memosData);
      } catch (error) {
        console.error("Failed to load memos", error);
      }
    })();
  });

  const handleCreateAndNavigate = async () => {
    try {
      const now = new Date().toISOString();
      const result = await addMemo("新規メモ", "", now);
      const newMemoId = result.lastInsertRowId;
      if (newMemoId) {
        router.push(`/${newMemoId}`);
      }
    } catch (error) {
      console.error("Failed to create memo", error);
    }
  };

  const renderMemoItem: ListRenderItem<Memo> = ({ item }) => (
    <Link href={`/${item.id}`} asChild>
      <List.Item
        title={item.title}
        titleStyle={{ fontWeight: "600", fontSize: 17, color: "#1c1c1e" }}
        description={item.content?.trim().substring(0, 100) || ""}
        descriptionStyle={{ fontSize: 15, color: "#8e8e93" }}
        descriptionNumberOfLines={1}
        left={(props) => <List.Icon {...props} icon="note-text-outline" />}
      />
    </Link>
  );

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <FlatList
        data={memos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMemoItem}
        ItemSeparatorComponent={() => {
          return <Divider />;
        }}
        contentContainerStyle={{ paddingBottom: bottom }}
      />
      <FAB
        style={[styles.fab, { bottom, right }]}
        icon="plus"
        onPress={handleCreateAndNavigate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
