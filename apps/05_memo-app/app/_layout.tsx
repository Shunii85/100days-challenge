import { Stack } from "expo-router";
import {
  MD3LightTheme as DefaultTheme,
  Provider as PaperProvider,
} from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

// カスタムテーマを定義
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#007AFF", // iOS風のシステムブルー
    secondary: "#5856D6",
  },
};

export default function RootLayout() {
  return (
    // 作成したテーマをアプリ全体に適用
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: "メモ一覧" }} />
          <Stack.Screen
            name="[id]"
            options={{ title: "メモの編集", headerTitleAlign: "center" }}
          />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
