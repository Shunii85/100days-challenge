// app/App.tsx
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Todo } from "./@types";
import { CheckSquare, Trash2, PlusSquare } from "lucide-react-native"; // lucide-react-nativeからアイコンをインポート

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    const storedTodos = await AsyncStorage.getItem("todos");
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
  };

  const addTodo = async () => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: inputValue,
      completed: false,
    };
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await AsyncStorage.setItem("todos", JSON.stringify(updatedTodos));
    setInputValue("");
  };

  const toggleTodo = async (id: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    await AsyncStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  const deleteTodo = async (id: string) => {
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    await AsyncStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <Text style={styles.title}>TODO app by Ai</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Add a new task"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={addTodo}
              style={styles.addButtonContainer}
            >
              <PlusSquare size={24} color="black" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={todos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.todoItem}>
                <TouchableOpacity onPress={() => toggleTodo(item.id)}>
                  <CheckSquare
                    size={24}
                    color={item.completed ? "green" : "gray"}
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    textDecorationLine: item.completed
                      ? "line-through"
                      : "none",
                    flex: 1,
                    marginLeft: 10,
                  }}
                >
                  {item.title}
                </Text>
                <TouchableOpacity onPress={() => deleteTodo(item.id)}>
                  <Trash2 size={24} color="red" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </TouchableWithoutFeedback>
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: Platform.OS === "ios" ? 40 : 0,
  },
  inner: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 28, // フォントサイズを大きく
    fontWeight: "600", // モダンなフォントウェイト
    marginTop: 20,
    marginBottom: 15, // タイトルの下にスペースを追加
    textAlign: "center",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  addButtonContainer: {
    marginLeft: 10,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});
