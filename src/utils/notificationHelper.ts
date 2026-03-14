import * as Notifications from "expo-notifications";
import api from "../utils/api";

export const registerForTopic = async (role: "mitra" | "customer") => {
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: "32b617f7-1807-4b44-858d-f90ffd537937",
    });
    await api.post("/notifications/subscribe", { token, role });
  } catch (e) {
    console.error(e);
  }
};
