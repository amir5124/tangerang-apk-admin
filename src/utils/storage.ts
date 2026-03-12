import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const storage = {
  save: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error("Error saving to localStorage", e);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  get: async (key: string) => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  delete: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },

  remove: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
