import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Image as ImageIcon, ImagePlus, LayoutGrid, Megaphone, Pencil } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import api from "../../src/utils/api";

const convertToBase64Web = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Ambil bagian base64-nya saja (setelah koma)
      resolve(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(blob);
  });
};

// Fungsi Utama untuk mendapatkan Base64
const getBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await convertToBase64Web(blob);
  } else {
    // Untuk Mobile, kita gunakan legacy API agar tidak ada error depedency
    return await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
  }
};

export default function MyAppsScreen() {
  const [broadcastEnabled, setBroadcastEnabled] = useState(false);
  const [target, setTarget] = useState<"user" | "mitra">("user");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const response = await api.get("/assets");
      setAssets(response.data || []);
    } catch (error) {
      console.error("Gagal memuat aset", error);
    }
  };

  const pickAndUpload = async (key_name: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0];

      try {
        // 1. Konversi dengan fungsi helper yang aman (Cross-platform)
        const base64 = await getBase64(file.uri);

        // 2. Kirim sebagai JSON murni
        const response = await api.post("/assets/upload-base64", {
          key_name: key_name,
          image_data: base64,
          file_name: "banner.jpg",
        });

        if (response.status === 200) {
          Alert.alert("Sukses", "Aset diperbarui");
          loadAssets();
        }
      } catch (error) {
        console.error("Upload Error:", error);
        Alert.alert("Gagal", "Terjadi kesalahan saat mengunggah.");
      }
    }
  };

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      Alert.alert("Gagal", "Pesan tidak boleh kosong");
      return;
    }
    setLoading(true);
    try {
      const targetTopic = target === "user" ? "all_customer" : "all_mitra";
      await api.post("/notifications/broadcast", {
        targetTopic: targetTopic,
        title: "Pengumuman",
        body: message,
        data: { type: "BROADCAST" },
      });
      Alert.alert("Sukses", `Broadcast berhasil dikirim ke ${target === "user" ? "Pengguna" : "Mitra"}`);
      setMessage("");
    } catch (error: any) {
      Alert.alert("Gagal", error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="bg-white px-4 pt-12 pb-6 mb-4">
        <Text className="text-2xl font-bold text-gray-800">Kontrol Aplikasi</Text>
        <Text className="text-gray-400 text-sm">Kelola assets dan promosi</Text>
      </View>

      <View className="px-4 mb-6">
        <View className="flex-row items-center mb-3">
          <ImageIcon size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Banner Slider</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4">
          {[1, 2, 3].map((id) => {
            const key = `banner_${id}`;
            const asset = assets?.find((a) => a.key_name === key);
            return (
              <View key={id} className="bg-white p-4 rounded-3xl border border-gray-100 w-64">
                <View className="h-32 bg-gray-100 rounded-2xl justify-center items-center mb-3 border-2 border-dashed border-gray-300 overflow-hidden">
                  {uploadProgress[key] > 0 ? (
                    <Text className="text-xs font-bold text-[#633594]">{uploadProgress[key]}%</Text>
                  ) : asset?.image_url ? (
                    <Image
                      source={{
                        uri: `https://backend.tangerangfast.online${asset.image_url}`,
                      }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <ImagePlus size={24} color="#94a3b8" />
                  )}
                </View>
                <Pressable onPress={() => pickAndUpload(key)} className="bg-gray-100 p-2 rounded-xl flex-row justify-center items-center">
                  <Pencil size={14} color="#633594" />
                  <Text className="text-xs text-[#633594] ml-2 font-bold">Ubah Gambar</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View className="px-4 mb-6">
        <View className="flex-row items-center mb-3">
          <LayoutGrid size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Aset Menu</Text>
        </View>
        <View className="bg-white p-5 rounded-3xl border border-gray-100 flex-row justify-between">
          {["AC", "Cleaning", "Tukang Kebun", "Lainnya"].map((menu) => {
            const key = `icon_${menu.toLowerCase()}`;
            const asset = assets?.find((a) => a.key_name === key);
            return (
              <Pressable key={menu} onPress={() => pickAndUpload(key)} className="items-center">
                <View className="w-12 h-12 bg-gray-100 rounded-2xl justify-center items-center mb-1">
                  {asset?.image_url ? (
                    <Image
                      source={{
                        uri: `https://backend.tangerangfast.online${asset.image_url}`,
                      }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <ImagePlus size={16} color="#94a3b8" />
                  )}
                </View>
                <Text className="text-[10px] text-gray-500">{menu}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="px-4 mb-6">
        <View className="flex-row items-center mb-3">
          <Megaphone size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Kirim Broadcast</Text>
        </View>
        <View className="bg-white p-5 rounded-3xl border border-gray-100">
          <View className="flex-row gap-2 mb-4">
            {(["user", "mitra"] as const).map((t) => (
              <Pressable key={t} onPress={() => setTarget(t)} className={`flex-1 py-2 rounded-xl items-center border ${target === t ? "bg-[#633594] border-[#633594]" : "bg-white border-gray-200"}`}>
                <Text className={target === t ? "text-white font-bold" : "text-gray-600"}>{t === "user" ? "Pengguna" : "Mitra"}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100" placeholder="Tulis pesan..." multiline numberOfLines={3} value={message} onChangeText={setMessage} />
          <Pressable className={`py-3 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-[#633594]"}`} onPress={handleSendBroadcast} disabled={loading}>
            <Text className="text-white font-bold">{loading ? "Mengirim..." : `Kirim ke ${target === "user" ? "Pengguna" : "Mitra"}`}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
