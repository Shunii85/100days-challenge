import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";

export default function RootLayout() {
  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "メモ一覧" }} />
        <Stack.Screen
          name="create"
          options={{ title: "新しいメモ", presentation: "modal" }}
        />
        <Stack.Screen name="[id]" options={{ title: "メモの編集" }} />
      </Stack>
    </PaperProvider>
  );
}
