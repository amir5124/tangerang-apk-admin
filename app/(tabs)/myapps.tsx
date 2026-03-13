import { Bell, Image as ImageIcon, ImagePlus, LayoutGrid, Megaphone, Plus, Star } from "lucide-react-native";
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
      {/* Header Tetap Sama */}
      <View className="bg-white px-4 pt-12 pb-6 mb-4">
        <Text className="text-2xl font-bold text-gray-800">Kontrol Aplikasi</Text>
        <Text className="text-gray-400 text-sm">Kelola aset dan promosi</Text>
      </View>

      {/* 1. EDIT BANNER SLIDER (Multi Slider) */}
      <View className="px-4 mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <ImageIcon size={20} color="#633594" />
            <Text className="text-lg font-bold text-gray-800 ml-2">Banner Slider</Text>
          </View>
          <Pressable className="bg-purple-100 px-3 py-1 rounded-full flex-row items-center">
            <Plus size={14} color="#633594" />
            <Text className="text-[#633594] text-xs font-bold ml-1">Tambah</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4">
          {[1, 2, 3].map((id) => (
            <View key={id} className="bg-white p-4 rounded-3xl border border-gray-100 w-64">
              <View className="h-32 bg-gray-100 rounded-2xl justify-center items-center mb-3 border-2 border-dashed border-gray-300">
                <ImagePlus size={24} color="#94a3b8" />
                <Text className="text-[10px] text-gray-400 mt-1">Banner {id}</Text>
              </View>
              <TextInput className="bg-gray-50 px-3 py-2 rounded-xl mb-3 text-xs border border-gray-100" placeholder="Link Promo..." />
              <Pressable className="bg-[#633594] py-2 rounded-xl items-center" onPress={() => handleSave(`Banner ${id}`)}>
                <Text className="text-white text-xs font-bold">Update Banner</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 2. LAYANAN POPULER & ICON MENU */}
      <View className="px-4 mb-6">
        <View className="flex-row items-center mb-3">
          <LayoutGrid size={20} color="#633594" />
          <Text className="text-lg font-bold text-gray-800 ml-2">Aset Menu & Layanan</Text>
        </View>
        <View className="bg-white p-5 rounded-3xl border border-gray-100">
          {/* Edit Gambar Layanan Populer */}
          <View className="flex-row items-center mb-3">
            <Star size={14} color="#e67e22" />
            <Text className="text-sm font-bold text-gray-700 ml-2">Gambar Layanan Populer</Text>
          </View>
          <View className="flex-row gap-3 mb-6">
            {[1, 2].map((i) => (
              <View key={i} className="flex-1 h-24 bg-gray-50 rounded-2xl border border-dashed border-gray-300 justify-center items-center">
                <ImagePlus size={20} color="#94a3b8" />
                <Text className="text-[9px] text-gray-400 mt-1">Layanan {i}</Text>
              </View>
            ))}
          </View>

          <View className="h-[1px] bg-gray-50 mb-5" />

          {/* Edit Icon Menu */}
          <Text className="text-sm font-bold text-gray-700 mb-4">Ubah Icon Kategori</Text>
          <View className="flex-row justify-between mb-4">
            {["AC", "Cleaning", "Tukang Kebun", "Lainnya"].map((menu) => (
              <View key={menu} className="items-center">
                <View className="w-12 h-12 bg-gray-100 rounded-2xl border border-dashed border-gray-300 justify-center items-center mb-1">
                  <ImagePlus size={16} color="#94a3b8" />
                </View>
                <Text className="text-[10px] text-gray-500 font-medium">{menu}</Text>
              </View>
            ))}
          </View>

          <Pressable className="bg-slate-800 py-3 rounded-xl items-center" onPress={() => handleSave("Icon Menu")}>
            <Text className="text-white font-bold">Simpan Layout Menu</Text>
          </Pressable>
        </View>
      </View>

      {/* Broadcast Management Tetap Sama */}
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
          <TextInput className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100" placeholder="Tulis pesan..." multiline numberOfLines={3} />
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-600">Aktifkan Notifikasi</Text>
            <Switch value={broadcastEnabled} onValueChange={setBroadcastEnabled} trackColor={{ true: "#633594" }} />
          </View>
          <Pressable className="bg-[#633594] py-3 rounded-xl items-center" onPress={() => handleSave("Broadcast")}>
            <Text className="text-white font-bold">Kirim ke {target === "user" ? "Pengguna" : "Mitra"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Pengaturan Sistem Tetap Sama */}
      <View className="px-4">
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
