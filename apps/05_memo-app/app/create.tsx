import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { addMemo } from "../db/database";

export default function CreateScreen() {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const router = useRouter();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("エラー", "タイトルを入力してください。");
      return;
    }
    try {
      const now = new Date().toISOString();
      await addMemo(title, content, now);
      router.back(); // 保存後に一覧へ戻る
    } catch (error) {
      console.error("Failed to save memo", error);
      Alert.alert("エラー", "保存に失敗しました。");
    }
  };

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
      <Button mode="contained" onPress={handleSave}>
        保存
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
  },
});
