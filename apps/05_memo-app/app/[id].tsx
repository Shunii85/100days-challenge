import { KeyboardAccessoryBar } from "@/components/KeyboardAccessaryBar";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  InputAccessoryView,
  Keyboard,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  IconButton,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteMemo, fetchMemos, updateMemo } from "../db/database";

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inputAccessoryViewID = "uniqueID";
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const isInitialMount = React.useRef(true);

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 画面が表示されたときに、IDに基づいてメモのデータを読み込む
  useEffect(() => {
    const loadMemo = async () => {
      if (!id) return;
      try {
        // 本来はID指定で一件取得するDB関数が望ましいが、ここでは全件取得から探す
        const allMemos = await fetchMemos();
        const currentMemo = allMemos.find((m) => m.id.toString() === id);
        if (currentMemo) {
          setTitle(currentMemo.title);
          setContent(currentMemo.content || "");
        }
      } catch (error) {
        console.error("Failed to load memo", error);
        Alert.alert("エラー", "メモの読み込みに失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    loadMemo();
  }, [id]);

  useEffect(() => {
    // 初回マウント時は自動保存を実行しない
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // デバウンス用のタイマーIDを保持する変数
    setIsSaving(true);
    const handler = setTimeout(() => {
      if (!id) return;
      // setIsSaving(true);
      try {
        const now = new Date().toISOString();
        updateMemo(parseInt(id, 10), title, content, now).catch((error) =>
          console.error("Auto-save failed", error)
        );
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        setIsSaving(false);
      }
    }, 100);

    return () => {
      clearTimeout(handler);
    };
  }, [title, content]);

  const handleUpdate = async () => {
    if (!id || !title.trim()) {
      Alert.alert("エラー", "タイトルを入力してください。");
      return;
    }
    try {
      const now = new Date().toISOString();
      await updateMemo(parseInt(id, 10), title, content, now);
      Keyboard.dismiss();
      router.back();
    } catch (error) {
      console.error("Failed to update memo", error);
      Alert.alert("エラー", "更新に失敗しました。");
    }
  };

  // 削除処理
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
            Keyboard.dismiss();
            router.back();
          } catch (error) {
            console.error("Failed to delete memo", error);
            Alert.alert("エラー", "削除に失敗しました。");
          }
        },
      },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconButton
            icon="trash-can-outline"
            size={24}
            style={{ margin: 0 }}
            onPress={() => handleDelete()}
          />
        </View>
      ),
    });
  }, [router]);

  if (isLoading) {
    return (
      <ActivityIndicator animating={true} size="large" style={styles.loader} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="タイトル"
        multiline
        style={[styles.textInput, styles.titleInput]}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
        mode="flat"
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        inputAccessoryViewID={inputAccessoryViewID}
      />
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="メモを入力"
        multiline
        style={[styles.textInput, styles.contentInput]}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
        mode="flat"
        textAlignVertical="top"
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        inputAccessoryViewID={inputAccessoryViewID}
      />

      <InputAccessoryView
        nativeID={inputAccessoryViewID}
        style={{ alignItems: "center" }}
      >
        <KeyboardAccessoryBar />
      </InputAccessoryView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    fontSize: 18,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
  },
});
