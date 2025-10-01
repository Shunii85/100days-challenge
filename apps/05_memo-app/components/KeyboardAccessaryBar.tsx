import React from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { IconButton, useTheme } from "react-native-paper";

export const KeyboardAccessoryBar = () => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceVariant,
        },
      ]}
    >
      <IconButton
        icon="keyboard-off-outline"
        onPress={() => Keyboard.dismiss()}
        style={{ marginVertical: 0, marginRight: 8 }}
        iconColor={colors.onSurfaceVariant}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    height: 48,
  },
});
