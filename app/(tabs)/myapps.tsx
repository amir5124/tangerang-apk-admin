import { Bell, Image, ImagePlus, Megaphone } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

export default function MyAppsScreen() {
  const [broadcastEnabled, setBroadcastEnabled] = useState(false);
  const [target, setTarget] = useState<"user" | "mitra">("user");

  const handleSave = (section: string) => {
    Alert.alert("Berhasil", `Perubahan pada ${section} telah disimpan!`);
  };

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-6 rounded-b-[30px] shadow-sm mb-4">
        <Text className="text-2xl font-bold text-gray-800">Kontrol Aplikasi</Text>
        <Text className="text-gray-400 text-sm">Kelola aset dan promosi</Text>
      </View>

      {/* Banner Management */}
      <View className="px-6 mb-6">
        <View className="flex-row items-center mb-3">
          <Image size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Banner Promo</Text>
        </View>
        <View className="bg-white p-5 rounded-3xl border border-gray-100">
          <View className="h-40 bg-gray-100 rounded-2xl justify-center items-center mb-4 border-2 border-dashed border-gray-300">
            <ImagePlus size={32} color="#94a3b8" />
            <Text className="text-gray-400 mt-2">Upload Banner Baru</Text>
          </View>
          <Pressable className="bg-[#633594] py-3 rounded-xl items-center" onPress={() => handleSave("Banner")}>
            <Text className="text-white font-bold">Simpan Banner</Text>
          </Pressable>
        </View>
      </View>

      {/* Broadcast Management */}
      <View className="px-6 mb-6">
        <View className="flex-row items-center mb-3">
          <Megaphone size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Kirim Broadcast</Text>
        </View>
        <View className="bg-white p-5 rounded-3xl border border-gray-100">
          {/* Target Selection */}
          <View className="flex-row gap-2 mb-4">
            {(["user", "mitra"] as const).map((t) => (
              <Pressable key={t} onPress={() => setTarget(t)} className={`flex-1 py-2 rounded-xl items-center border ${target === t ? "bg-[#633594] border-[#633594]" : "bg-white border-gray-200"}`}>
                <Text className={target === t ? "text-white font-bold" : "text-gray-600"}>{t === "user" ? "Pengguna" : "Mitra"}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100" placeholder="Tulis pesan..." multiline numberOfLines={3} />

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-600">Aktifkan Notifikasi</Text>
            <Switch value={broadcastEnabled} onValueChange={setBroadcastEnabled} trackColor={{ true: "#633594" }} />
          </View>
          <Pressable className="bg-slate-800 py-3 rounded-xl items-center" onPress={() => handleSave("Broadcast")}>
            <Text className="text-white font-bold">Kirim ke {target === "user" ? "Pengguna" : "Mitra"}</Text>
          </Pressable>
        </View>
      </View>

      {/* App Settings */}
      <View className="px-6">
        <View className="flex-row items-center mb-3">
          <Bell size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Pengaturan Sistem</Text>
        </View>
        <View className="bg-white p-5 rounded-3xl border border-gray-100">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-700">Maintenance Mode</Text>
            <Switch />
          </View>
          <View className="h-[1px] bg-gray-100 my-2" />
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-700">Allow New Registration</Text>
            <Switch value={true} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
