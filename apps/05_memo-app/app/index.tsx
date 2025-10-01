import { Link, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, ListRenderItem, StyleSheet, View } from "react-native";
import { FAB, List } from "react-native-paper";
import { fetchMemos, Memo } from "../db/database"; // Memo型をインポート

export default function HomeScreen() {
  const [memos, setMemos] = useState<Memo[]>([]);

  const loadMemos = useCallback(async () => {
    try {
      const memosData = await fetchMemos();
      setMemos(memosData);
    } catch (error) {
      console.error("Failed to load memos", error);
    }
  }, []);

  // 画面が表示されるたびにメモを再読み込み
  useFocusEffect(loadMemos);

  const renderMemoItem: ListRenderItem<Memo> = ({ item }) => (
    <Link href={`/${item.id}`} asChild>
      <List.Item
        title={item.title}
        description={item.content?.substring(0, 30) || " "}
        descriptionNumberOfLines={1}
        left={(props) => <List.Icon {...props} icon="note-text-outline" />}
      />
    </Link>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={memos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMemoItem}
      />
      <Link href="/create" asChild>
        <FAB style={styles.fab} icon="plus" />
      </Link>
    </View>
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
