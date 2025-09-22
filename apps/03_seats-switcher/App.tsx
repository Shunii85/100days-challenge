import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Keyboard,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";

// --- Types ---
type SeatKey = `${number}-${number}`;

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [rowsInput, setRowsInput] = useState<string>("4");
  const [colsInput, setColsInput] = useState<string>("6");
  const [rows, setRows] = useState<number>(4);
  const [cols, setCols] = useState<number>(6);
  const [removed, setRemoved] = useState<Set<SeatKey>>(new Set());
  const [seatNumbers, setSeatNumbers] = useState<Map<SeatKey, number>>(
    new Map()
  );
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  const gridRef = useRef<View>(null);

  useEffect(() => {
    if (!permissionResponse?.granted) {
      requestPermission();
    }
  }, []);

  const windowWidth = Dimensions.get("window").width;
  const seatGap = 8;
  const horizontalPadding = 24; // container padding left+right

  const seatSize = useMemo<number>(() => {
    const available = windowWidth - horizontalPadding - (cols - 1) * seatGap;
    return Math.max(36, Math.floor(available / cols));
  }, [windowWidth, cols]);

  const toInt = (v: string, fallback = 1): number => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const applyGrid = () => {
    const r = Math.max(1, toInt(rowsInput));
    const c = Math.max(1, toInt(colsInput));
    setRows(r);
    setCols(c);
    // out-of-range removed seats を削る
    setRemoved((prev) => {
      const next = new Set<SeatKey>();
      prev.forEach((key) => {
        const [rrStr, ccStr] = (key as string).split("-");
        const rr = Number(rrStr);
        const cc = Number(ccStr);
        if (rr < r && cc < c) next.add(`${rr}-${cc}` as SeatKey);
      });
      return next;
    });
    // レイアウト変更時は席次クリア
    setSeatNumbers(new Map());

    Keyboard.dismiss();
  };

  const toggleSeat = (r: number, c: number) => {
    const key = `${r}-${c}` as SeatKey;
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSeatNumbers((prev) => {
      if (!prev.size) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const clearRemoved = () => {
    setRemoved(new Set());
    setSeatNumbers(new Map());
  };

  const getActiveSeatKeys = (): SeatKey[] => {
    const keys: SeatKey[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}` as SeatKey;
        if (!removed.has(key)) keys.push(key);
      }
    }
    return keys;
  };

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const generateSeatNumbers = () => {
    const active = getActiveSeatKeys();
    const n = active.length;
    if (n === 0) {
      Alert.alert("席次生成", "使用可能な席がありません。");
      return;
    }
    const numbers = shuffle(Array.from({ length: n }, (_, i) => i + 1));
    const map = new Map<SeatKey, number>();
    for (let i = 0; i < n; i++) map.set(active[i], numbers[i]);
    setSeatNumbers(map);
  };

  const clearSeatNumbers = () => setSeatNumbers(new Map());

  // === 撮影時だけ isRemoved を非表示にする ===
  const waitNextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const saveGridImage = async () => {
    try {
      // 1) 非表示モード ON
      setIsCapturing(true);
      // 2) レンダリング反映を待つ
      await waitNextFrame();
      await waitNextFrame();
      // 3) キャプチャ
      const uri = await captureRef(gridRef, { quality: 1 });
      // 4) 非表示モード OFF（失敗しても必ず戻す）
      setIsCapturing(false);

      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("保存完了", "席次表を画像として保存しました。");
      }
    } catch (e) {
      setIsCapturing(false);
      if (!permissionResponse?.granted) {
        Alert.alert(
          "保存失敗",
          "写真アプリへのアクセス権限がありません。設定よりご確認ください。"
        );
        return;
      }
      console.warn(e);
      Alert.alert("保存失敗", "画像の保存に失敗しました。");
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>席替えツール</Text>

      <View style={styles.controls}>
        <View style={styles.inputRow}>
          <Text style={styles.label}>行 (縦)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={rowsInput}
            onChangeText={(t: string) => setRowsInput(t)}
            placeholder="4"
          />

          <Text style={styles.label}>列 (横)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={colsInput}
            onChangeText={(t: string) => setColsInput(t)}
            placeholder="6"
          />

          <TouchableOpacity style={styles.applyBtn} onPress={applyGrid}>
            <Text style={styles.applyTxt}>適用</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={generateSeatNumbers}
          >
            <Text style={styles.primaryTxt}>新しい席次を生成</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={clearSeatNumbers}>
            <Text>席次クリア</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={clearRemoved}>
            <Text>リセット</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.gridScroll}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            ref={gridRef}
            collapsable={false}
            style={[styles.grid, { paddingHorizontal: horizontalPadding / 2 }]}
          >
            {Array.from({ length: rows }, (_, r) => (
              <View
                key={`row-${r}`}
                style={[styles.row, { marginBottom: r == rows - 1 ? 0 : 10 }]}
              >
                {Array.from({ length: cols }, (_, c) => {
                  const key = `${r}-${c}` as SeatKey;
                  const isRemoved = removed.has(key);
                  const num = seatNumbers.get(key);

                  // 撮影中は、除外席を「見えないダミー」に差し替え（空白として残す）
                  if (isCapturing && isRemoved) {
                    return (
                      <View
                        key={key}
                        style={{
                          width: seatSize,
                          height: seatSize,
                          marginRight: c === cols - 1 ? 0 : seatGap,
                        }}
                      />
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      style={[
                        styles.seat,
                        {
                          width: seatSize,
                          height: seatSize,
                          marginRight: c === cols - 1 ? 0 : seatGap,
                        },
                        isRemoved ? styles.seatRemoved : styles.seatActive,
                      ]}
                      onPress={() => toggleSeat(r, c)}
                    >
                      {!isRemoved ? (
                        !!num && <Text style={styles.seatText}>{num}</Text>
                      ) : (
                        <AntDesign name="close" size={18} color="#c33" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      <TouchableOpacity style={styles.saveBtn} onPress={saveGridImage}>
        <MaterialIcons name="save-alt" size={16} color="black" />
        <Text>画像保存(PNG)</Text>
      </TouchableOpacity>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatActive]} />
          <Text>使用可能</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatRemoved]} />
          <Text>除外済み</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        ※席をタップして除外 /
        解除できます。レイアウト確定後「新しい席次を生成」で番号を割り当て。
      </Text>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  // --- Layout / Typography ---
  root: {
    flex: 1,
    backgroundColor: "#f8fafc", // やさしい薄グレー
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: "#0f172a", // 濃紺グレー
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // --- Controls (inputs & buttons) ---
  controls: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  label: {
    marginRight: 2,
    color: "#334155",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 68,
    borderRadius: 10,
    marginRight: 8,
    fontWeight: "600",
    color: "#0f172a",
  },
  applyBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  applyTxt: { color: "#fff", fontWeight: "700" },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 0,
    marginVertical: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  primaryBtn: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  primaryTxt: { color: "#fff", fontWeight: "800" },

  // --- Grid area ---
  gridScroll: {},
  grid: {
    alignItems: "flex-start",
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderColor: "#e2e8f0",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: "row" },

  seat: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    position: "relative",
  },
  seatActive: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  seatRemoved: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  seatText: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  // --- Save row ---
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginRight: 16,
    marginLeft: "auto",
  },

  // --- Legend & hint ---
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 6,
    marginBottom: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendBox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },
});
