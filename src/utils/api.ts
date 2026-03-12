import axios from "axios";
import { storage } from "../utils/storage";

const API = axios.create({
  baseURL: "https://backend.tangerangfast.online/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

API.interceptors.request.use(
  async (config) => {
    const token = await storage.get("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default API;
