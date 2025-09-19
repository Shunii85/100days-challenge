import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ListRenderItem,
  ScrollView,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "@todo_items";

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [items, setItems] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  // states for multi select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        console.log(raw);
        if (raw) setItems(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to load items", e);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(() => {
    const title = text.trim();
    if (!title) return;
    const newItem: Todo = {
      id: Date.now().toString(),
      title,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
    setText("");
    inputRef.current?.blur();
  }, [text]);

  const toggleItemDone = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id);
      Alert.alert("削除しますか？", `"${target?.title}" を削除します。`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => setItems((prev) => prev.filter((i) => i.id !== id)),
        },
      ]);
    },
    [items]
  );

  // --- multi-select helpers ---
  const enterSelectionMode = useCallback((firstId?: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (firstId) next.add(firstId);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  }, [items]);

  const unselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert("選択したタスクを削除", `${count}件を削除します。`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
          exitSelectionMode();
        },
      },
    ]);
  }, [selectedIds, exitSelectionMode]);

  const remaining = useMemo(() => items.filter((i) => !i.done).length, [items]);

  const renderItem: ListRenderItem<Todo> = useCallback(
    ({ item }) => {
      const selected = selectedIds.has(item.id);

      return (
        <Pressable
          onLongPress={() => enterSelectionMode(item.id)}
          onPress={() => {
            if (selectionMode) toggleSelect(item.id);
            else toggleItemDone(item.id);
          }}
          style={[styles.row, selected && styles.rowSelected]}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          {/* left: done checkbox */}
          <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
            {item.done && <Ionicons name="checkmark" size={18} />}
          </View>

          <Text style={[styles.title, item.done && styles.titleDone]}>
            {item.title}
          </Text>

          {/* right: when in selection mode show selection indicator, otherwise show trash icon */}
          {selectionMode ? (
            <Ionicons
              name={selected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
            />
          ) : (
            <Pressable hitSlop={16} onPress={() => removeItem(item.id)}>
              <Ionicons name="trash" size={20} />
            </Pressable>
          )}
        </Pressable>
      );
    },
    [
      selectionMode,
      selectedIds,
      toggleItemDone,
      toggleSelect,
      enterSelectionMode,
      removeItem,
    ]
  );

  const keyExtractor = useCallback((it: Todo) => it.id, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* header */}
          <View style={styles.headerBar}>
            <Text style={styles.header}>T O D O</Text>
          </View>

          {/* selection toolbar */}
          {selectionMode && (
            <View style={styles.toolbar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.actionsRow}
              >
                <Pressable style={styles.toolBtn} onPress={deleteSelected}>
                  <Ionicons name="trash" size={18} />
                  <Text style={styles.toolText}>削除 ({selectedIds.size})</Text>
                </Pressable>

                <Pressable style={styles.toolBtn} onPress={selectAll}>
                  <Ionicons name="checkbox" size={18} />
                  <Text style={styles.toolText}>すべて選択</Text>
                </Pressable>

                <Pressable style={styles.toolBtn} onPress={unselectAll}>
                  <Ionicons name="close-circle" size={18} />
                  <Text style={styles.toolText}>すべて解除</Text>
                </Pressable>
              </ScrollView>

              <Pressable
                style={[styles.toolBtn, styles.cancelBtn]}
                onPress={exitSelectionMode}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} />
                <Text style={styles.toolText}>キャンセル</Text>
              </Pressable>
            </View>
          )}

          {/* input row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="やることを入力..."
              value={text}
              onChangeText={setText}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <Pressable style={styles.addBtn} onPress={addItem}>
              <Ionicons name="add" size={24} />
            </Pressable>
          </View>

          <Text style={styles.counter}>
            残り {remaining} / 合計 {items.length}
          </Text>

          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: 8 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "none"}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 16 },
  headerBar: { justifyContent: "flex-end" },
  header: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e5e5",
  },
  actionsRow: {
    gap: 12,
    paddingRight: 8,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toolText: { fontSize: 14 },
  cancelBtn: {
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: { color: "#666", marginBottom: 8 },
  list: { paddingVertical: 8, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
  },
  rowSelected: { backgroundColor: "#eef6ff", borderColor: "#cfe3ff" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: "#e5ffe5", borderColor: "#8ad18a" },
  title: { flex: 1, fontSize: 16 },
  titleDone: { textDecorationLine: "line-through", color: "#999" },
});
