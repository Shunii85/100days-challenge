import type { FC } from "react";
import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// 時間を MM:SS 形式にフォーマットする関数
const formatTime = (milliSec: number): string => {
  const timeInSeconds = milliSec / 1000;

  const minutes = Math.floor((timeInSeconds / 60) % 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const centiseconds = Math.floor((milliSec % 1000) / 10);

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;

  return formattedTime;
};

const App: FC = () => {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
};
const Root: FC = () => {
  // 時間はすべてmilli secs
  const [time, setTime] = useState(0); // 経過時間 (ms)
  const [isActive, setIsActive] = useState<boolean>(false); // タイマーが動作中かどうかの状態
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // インターバルIDを保持するためのref
  const startTimeRef = useRef(0);

  // タイマーの開始・停止を制御するEffect
  useEffect(() => {
    if (isActive) {
      // 定期的に更新
      intervalRef.current = setInterval(() => {
        const elapsedTime = Math.floor(Date.now() - startTimeRef.current);
        setTime(elapsedTime);
      }, 10);
    } else if (intervalRef.current) {
      // タイマーが非アクティブな場合、インターバルをクリア
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // コンポーネントのアンマウント時にインターバルをクリアするクリーンアップ関数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  // スタート・ストップボタンが押されたときの処理
  const handleStartStop = (): void => {
    if (!isActive) {
      startTimeRef.current = Date.now() - time;
    }
    setIsActive(!isActive);
  };

  // リセットボタンが押されたときの処理
  const handleReset = (): void => {
    setIsActive(false);
    setTime(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ステータスバーの文字色を白に設定 */}
      <StatusBar barStyle="light-content" />

      {/* 時間表示エリア */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(time)}</Text>
      </View>

      {/* ボタンエリア */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>リセット</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            isActive ? styles.stopButton : styles.startButton,
          ]}
          onPress={handleStartStop}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {isActive ? "ストップ" : "スタート"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default App;

// スタイル定義
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1B2A", // 背景色：ダークネイビー
    alignItems: "center",
    justifyContent: "center",
  },
  timerContainer: {
    flex: 3, // 画面の2/3を占める
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 80,
    fontWeight: "200", // 細めのフォント
    color: "#E0E1DD", // 文字色：オフホワイト
    // OSごとに最適な等幅フォントを指定
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "monospace",
  },
  buttonContainer: {
    flex: 2, // 画面の1/3を占める
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "90%",
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50, // 円形にする
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    elevation: 5, // Android用の影
    shadowColor: "#000", // iOS用の影
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 18,
    color: "#E0E1DD",
    fontWeight: "bold",
  },
  startButton: {
    borderColor: "#4CAF50", // 枠線の色：緑
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  stopButton: {
    borderColor: "#F44336", // 枠線の色：赤
    backgroundColor: "rgba(244, 67, 54, 0.1)",
  },
  resetButton: {
    borderColor: "#778DA9", // 枠線の色：グレーブルー
    backgroundColor: "rgba(119, 141, 169, 0.1)",
  },
});
