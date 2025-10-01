import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, TextInput } from "react-native-paper";
import { deleteMemo, fetchMemos, updateMemo } from "../db/database";

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadMemo = async () => {
      if (!id) return;
      // 本来はID指定で一件取得するDB関数が望ましい
      const allMemos = await fetchMemos();
      const currentMemo = allMemos.find((m) => m.id.toString() === id);
      if (currentMemo) {
        setTitle(currentMemo.title);
        setContent(currentMemo.content || "");
      }
      setIsLoading(false);
    };
    loadMemo();
  }, [id]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      const now = new Date().toISOString();
      await updateMemo(parseInt(id, 10), title, content, now);
      router.back();
    } catch (error) {
      console.error("Failed to update memo", error);
      Alert.alert("エラー", "更新に失敗しました。");
    }
  };

  const handleDelete = () => {
    Alert.alert("削除の確認", "本当にこのメモを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          try {
            await deleteMemo(parseInt(id, 10));
            router.back();
          } catch (error) {
            console.error("Failed to delete memo", error);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <ActivityIndicator animating={true} size="large" style={styles.loader} />
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="タイトル"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        label="内容"
        value={content}
        onChangeText={setContent}
        style={[styles.input, styles.contentInput]}
        multiline
        textAlignVertical="top"
      />
      <Button mode="contained" onPress={handleUpdate} style={styles.button}>
        更新
      </Button>
      <Button
        icon="delete"
        mode="contained"
        onPress={handleDelete}
        buttonColor="#d9534f"
      >
        削除
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  input: { marginBottom: 16 },
  contentInput: { flex: 1 },
  button: { marginBottom: 16 },
});
