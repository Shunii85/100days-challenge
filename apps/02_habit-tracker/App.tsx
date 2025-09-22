import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  eachDayOfInterval,
  endOfYear,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfWeek,
  startOfYear,
  differenceInCalendarWeeks,
} from "date-fns";
import uuid from "react-native-uuid";
import { Feather } from "@expo/vector-icons";

type DayKey = string;

type HabitMap = Record<DayKey, 0 | 1>;

type HabitId = string;

type Habit = { id: HabitId; name: string };

type HabitEntries = Record<HabitId, HabitMap>;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const STORAGE_KEY = "habits";
const HABITS_KEY = "habit.list";

function toKey(d: Date): DayKey {
  return format(d, "yyyy-MM-dd");
}

function fromKey(k: DayKey): Date {
  return parseISO(k);
}

const CELL_SIZE = 18;
const CELL_GAP = 4;
const WEEK_COL_WIDTH = CELL_SIZE + CELL_GAP;

function getColor(v: 0 | 1): string {
  return v === 1 ? "#16a34a" : "#e5e7eb";
}

/** Year grid (GitHub-like heatmap) */
function useYearGrid(year: number) {
  const start = startOfWeek(startOfYear(new Date(year, 0, 1)), {
    weekStartsOn: 0,
  });
  const end = endOfYear(new Date(year, 0, 1));
  const days = eachDayOfInterval({ start, end });

  const weeks = useMemo(() => {
    const map: Record<number, (Date | null)[]> = {};
    for (const d of days) {
      const w = differenceInCalendarWeeks(d, start, { weekStartsOn: 0 });
      const dow = getDay(d);
      if (!map[w]) map[w] = Array(7).fill(null);
      map[w][dow] = d;
    }
    const maxWeek = Math.max(...Object.keys(map).map(Number));
    const arr: (Date | null)[][] = [];
    for (let i = 0; i <= maxWeek; i++) arr.push(map[i] ?? Array(7).fill(null));
    return arr;
  }, [days, start]);

  const todayWeekIndex = useMemo(() => {
    const idx = differenceInCalendarWeeks(new Date(), start, {
      weekStartsOn: 0,
    });
    return Math.max(0, Math.min(idx, weeks.length - 1));
  }, [start, weeks.length]);

  return { start, end, weeks, todayWeekIndex };
}

/** Persist */
async function loadEntries(): Promise<HabitEntries> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HabitEntries;
    return {};
  } catch (e) {
    console.warn("Failed to load entries", e);
    return {};
  }
}

async function loadHabits(): Promise<Habit[]> {
  try {
    const raw = await AsyncStorage.getItem(HABITS_KEY);
    if (raw) return JSON.parse(raw) as Habit[];
    return [];
  } catch (e) {
    console.warn("Failed to load habits", e);
    return [];
  }
}

async function saveHabits(list: Habit[]) {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to save habits", e);
  }
}

async function saveEntries(data: HabitEntries) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save entries", e);
  }
}

/** Streaks */
function calcStreaks(entries: HabitMap) {
  const today = new Date();
  const keys = Object.keys(entries)
    .filter((k) => entries[k] === 1)
    .sort((a, b) => fromKey(a).getTime() - fromKey(b).getTime());
  let best = 0;
  let current = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = fromKey(k);
    if (prev && (d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24) === 1)
      current += 1;
    else current = 1;
    best = Math.max(best, current);
    prev = d;
  }
  if (!keys.length) return { current: 0, best: 0, total: 0 };
  const last = fromKey(keys[keys.length - 1]);
  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  const adjustedCurrent = diffDays <= 1 ? current : 0;
  return { current: adjustedCurrent, best, total: keys.length };
}

/** Main */
export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

export function Root() {
  const year = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(year);
  const { start, weeks, todayWeekIndex } = useYearGrid(selectedYear);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntries>({});

  const listRefs = useRef<Record<string, FlatList<any> | null>>({});
  const [isYearPickerOpen, setYearPickerOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");

  useEffect(() => {
    (async () => {
      const [loadedEntries, loadedHabits] = await Promise.all([
        loadEntries(),
        loadHabits(),
      ]);
      setEntries(loadedEntries);
      setHabits(loadedHabits);
    })();
  }, []);

  const recordedYears = useMemo(() => {
    const years = new Set<number>();
    Object.values(entries).forEach((map) => {
      Object.keys(map).forEach((k) => {
        years.add(fromKey(k).getFullYear());
      });
    });
    if (years.size === 0) years.add(year); // 空避け
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  // 習慣追加
  const addHabit = useCallback(async () => {
    const name = newHabitName.trim();
    if (!name) {
      return;
    }
    const exists = new Set(habits.map((h) => h.name));
    if (exists.has(name)) {
      Alert.alert("習慣が重複しています", "新しい習慣を入力してみましょう！");
      setNewHabitName("");
      return;
    }

    const id = uuid.v4();
    const newHabit: Habit = { id, name };
    setHabits((prev) => {
      const next = [...prev, newHabit];
      saveHabits(next);
      return next;
    });
    setEntries((prev) => {
      const next = { ...prev, [id]: {} };
      saveEntries(next);
      return next;
    });
    setNewHabitName("");
    setIsAddOpen(false);
  }, [newHabitName, habits]);

  const deleteHabit = useCallback(
    (habitId: HabitId) => {
      const name = habits.find((h) => h.id == habitId)?.name ?? "";
      Alert.alert(
        `習慣「${name}」を削除します`,
        "本当に削除しますか？この操作は取り消すことができません。",
        [
          {
            text: "キャンセル",
            style: "cancel",
          },
          {
            text: "削除",
            onPress: () => {
              setHabits((prev) => {
                const next = prev.filter((p) => p.id !== habitId);
                saveHabits(next);
                return next;
              });
              setEntries((prev) => {
                const next = { ...prev } as HabitEntries;
                delete next[habitId];
                saveEntries(next);
                return next;
              });
            },
            style: "destructive",
          },
        ]
      );
    },
    [start, weeks.length]
  );

  const toggleRecordToday = useCallback(async (habitId: HabitId) => {
    const todayKey = toKey(new Date());
    setEntries((prev) => {
      const map = { ...(prev[habitId] ?? {}) } as HabitMap;
      const isDone = map[todayKey] === 1;
      // トグル動作
      if (isDone) delete map[todayKey];
      else map[todayKey] = 1;
      const next: HabitEntries = { ...prev, [habitId]: map };
      saveEntries(next);
      return next;
    });
  }, []);

  const todayKey = toKey(new Date());

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="default" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title}>習慣トラッカー</Text>
            {/* <Text style={styles.subtitle}>{year} 年</Text> */}
            <TouchableOpacity onPress={() => setYearPickerOpen(true)}>
              <Text style={styles.subtitle}>{selectedYear} 年 ▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddOpen(true)}
          >
            <Text style={styles.addBtnText}>＋ 追加</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendText}>未達成</Text>
          <View style={[styles.legendCell, { backgroundColor: getColor(0) }]} />
          <Text style={styles.legendText}>→</Text>
          <View style={[styles.legendCell, { backgroundColor: getColor(1) }]} />
          <Text style={styles.legendText}>達成</Text>
        </View>
      </View>

      {/* 縦並びセクション： [タイトル + GridRow + その下に記録ボタン] */}
      <ScrollView contentContainerStyle={styles.sectionList}>
        {!habits.length ? (
          <View>
            <Text
              style={{
                color: "#6b7280",
                fontSize: 16,
                paddingTop: 32,
                textAlign: "center",
              }}
            >
              習慣が未登録です
            </Text>
          </View>
        ) : (
          habits.map((h) => {
            const map = entries[h.id] ?? {};
            const streaks = calcStreaks(map);
            const doneToday = map[todayKey] === 1;
            return (
              <View key={h.id} style={styles.section}>
                {/* タイトル（習慣名 + 簡易統計）*/}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{h.name}</Text>
                  <Text style={styles.sectionMeta}>
                    連続{streaks.current}日 / 最長{streaks.best} / 累計
                    {streaks.total}
                  </Text>
                </View>

                <View style={styles.gridRow}>
                  {/* Weekday gutter */}
                  <View style={{ marginRight: 8 }}>
                    {WEEKDAY_LABELS.map((weekday, i) => (
                      <View
                        key={i}
                        style={{
                          height: CELL_SIZE,
                          marginBottom: CELL_GAP,
                          justifyContent: "center",
                        }}
                      >
                        <Text style={styles.weekday}>{weekday}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Weeks columns */}
                  <FlatList
                    ref={(ref) => {
                      listRefs.current[h.id] = ref;
                    }}
                    data={weeks}
                    keyExtractor={(_, i) => `w-${i}`}
                    initialScrollIndex={todayWeekIndex}
                    getItemLayout={(_, index) => ({
                      length: WEEK_COL_WIDTH,
                      offset: WEEK_COL_WIDTH * index,
                      index,
                    })}
                    onScrollToIndexFailed={(info) => {
                      setTimeout(
                        () =>
                          listRefs.current[h.id]?.scrollToIndex({
                            index: info.index,
                            animated: false,
                          }),
                        50
                      );
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingLeft: 4,
                    }}
                    renderItem={({ item: week, index: wi }) => (
                      <View style={{ marginRight: CELL_GAP }}>
                        {week.map((d, di) => {
                          const k = d ? toKey(d) : `x-${wi}-${di}`;
                          const v: 0 | 1 = d && map[k] === 1 ? 1 : 0;
                          const isToday = d ? isSameDay(d, new Date()) : false;
                          return (
                            <View
                              key={k}
                              style={{
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                                marginBottom: CELL_GAP,
                                borderRadius: 4,
                                backgroundColor: d
                                  ? getColor(v)
                                  : "transparent",
                                borderWidth: isToday ? 2 : 1,
                                borderColor: d
                                  ? isToday
                                    ? "#0b5626"
                                    : "#d1d5db"
                                  : "transparent",
                                opacity: d ? 1 : 0,
                              }}
                            />
                          );
                        })}
                      </View>
                    )}
                  />
                </View>

                {/* その下に記録ボタン */}
                <View style={styles.sectionActions}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => toggleRecordToday(h.id)}
                      style={[
                        styles.habitBtn,
                        doneToday && styles.habitBtnDone,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.habitBtnText,
                          doneToday && styles.habitBtnTextDone,
                        ]}
                      >
                        {doneToday ? "✓ 完了" : "今日を記録"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        listRefs.current[h.id]?.scrollToIndex({
                          index: todayWeekIndex,
                          animated: true,
                        })
                      }
                      style={styles.todayBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.todayBtnText}>今日</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteHabit(h.id)}
                    style={styles.deleteBtn}
                  >
                    {/* <Text style={styles.deleteBtnText}>習慣を削除</Text> */}
                    <Feather name="trash-2" size={20} color="#f43d3d" />
                    <Text style={styles.deleteBtnText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 年選択モーダル */}
      <Modal
        visible={isYearPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYearPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setYearPickerOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>年を選択</Text>
              {recordedYears.map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => {
                    setSelectedYear(y);
                    setYearPickerOpen(false);
                  }}
                  style={[
                    styles.yearItem,
                    y === selectedYear && styles.yearItemActive,
                  ]}
                >
                  <Text style={[styles.yearItemText]}>{y} 年</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* 追加モーダル */}
      <Modal
        visible={isAddOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setNewHabitName("");
          setIsAddOpen(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsAddOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>習慣を追加</Text>
              <TextInput
                placeholder="習慣名（例：運動）"
                value={newHabitName}
                onChangeText={setNewHabitName}
                style={styles.input}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setIsAddOpen(false)}>
                  <Text style={styles.modalCancel}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addHabit}
                  disabled={newHabitName == ""}
                  style={styles.modalAddBtn}
                >
                  <Text style={styles.modalAddText}>追加</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/** Styles */
const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16, backgroundColor: "#fff" },

  header: { paddingTop: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },

  addBtn: {
    backgroundColor: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "700" },

  legendRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  legendCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  legendText: { fontSize: 12, color: "#6b7280" },

  sectionList: { paddingVertical: 16 },
  section: {
    marginTop: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  gridRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  weekday: { fontSize: 10, color: "#6b7280", textAlign: "center" },

  sectionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },

  // Year Select
  yearItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "#f8fafc",
  },
  yearItemActive: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#b1d2fb",
    backgroundColor: "#b1d2fb4d",
  },
  yearItemText: { fontSize: 16, color: "#111827", fontWeight: "600" },

  // Buttons
  habitBtn: {
    backgroundColor: "#111827",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  habitBtnDone: { backgroundColor: "#10b981" },
  habitBtnText: { color: "#fff", fontWeight: "700" },
  habitBtnTextDone: { color: "#0b3d2e" },

  todayBtn: {
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  todayBtnText: { color: "#111827", fontWeight: "700" },

  deleteBtn: {
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f43d3d",
  },
  deleteBtnText: {
    color: "#f43d3d",
    fontWeight: "700",
  },

  // AddModal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  modalCancel: { color: "#6b7280", fontSize: 14 },
  modalAddBtn: {
    backgroundColor: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalAddText: { color: "#fff", fontWeight: "700" },
});
