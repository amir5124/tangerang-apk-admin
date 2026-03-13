import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { LogOut, Percent, Phone, Search, Store, UserCheck } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import api from "../../src/utils/api";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "admin" | "mitra" | "customer">("all");
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users/admin/all-users");
      if (response.data?.success) setUsers(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Konfirmasi Logout", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token"); // Sesuaikan dengan key token Anda
          router.replace("/(auth)/login"); // Arahkan ke rute login Anda
        },
      },
    ]);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUsers();
    }, []),
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === "all" || u.role === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [users, search, activeTab]);

  const renderUserItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-[10px] mb-4 mx-4">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-slate-500 justify-center items-center">
          <Text className="text-white font-bold text-lg">{getInitials(item.full_name || "NA")}</Text>
        </View>
        <View className="flex-1 ml-4">
          <Text className="text-gray-800 font-bold text-base">{item.full_name}</Text>
          <Text className="text-gray-400 text-xs">{item.email}</Text>
          <View className="flex-row items-center mt-1">
            <Phone size={12} color="#94a3b8" />
            <Text className="text-gray-500 text-xs ml-1">{item.phone_number || "-"}</Text>
          </View>
        </View>
        <View className="px-3 py-1 rounded-full bg-slate-100">
          <Text className="text-[10px] font-bold text-slate-600">{item.role?.toUpperCase()}</Text>
        </View>
      </View>

      {item.role === "mitra" && (
        <View className="border-t border-gray-50 pt-4 mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Store size={14} color="#64748b" />
            <View className="ml-2">
              <Text className="text-xs font-bold text-gray-700">{item.store_name || "-"}</Text>
              <Text className={`text-[10px] font-bold ${item.store_status === "approved" ? "text-green-600" : "text-orange-500"}`}>{item.store_status?.toUpperCase() || "PENDING"}</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable onPress={() => Alert.alert("Approve", "Setujui mitra ini?")} className="bg-green-50 p-2.5 rounded-xl">
              <UserCheck size={18} color="#16a34a" />
            </Pressable>
            <Pressable onPress={() => Alert.prompt("Ubah Komisi", "Masukkan %:", (val) => console.log(val))} className="bg-orange-50 p-2.5 rounded-xl">
              <Percent size={18} color="#ea580c" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <View className="bg-white px-4 pt-12 pb-6 mb-4 ">
        {/* Bagian Judul dan Logout dalam satu baris */}
        <View className="flex-row justify-between items-start mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-800">Kontrol Pengguna</Text>
            <Text className="text-gray-400 text-sm">Kelola dan approval status</Text>
          </View>

          <Pressable onPress={handleLogout} className="p-2.5 bg-red-50 rounded-2xl active:bg-red-100">
            <LogOut size={22} color="#ef4444" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="flex-row bg-[#F5F7FA] rounded-2xl px-4 py-3 items-center">
          <Search size={20} color="#94a3b8" />
          <TextInput className="flex-1 ml-3 text-sm text-gray-700" placeholder="Cari nama atau email..." value={search} onChangeText={setSearch} />
        </View>
      </View>

      <View className="flex-row px-6 mb-4 gap-2">
        {["all", "admin", "mitra", "customer"].map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-[10px] ${activeTab === tab ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
            <Text className={`text-[10px] font-bold ${activeTab === tab ? "text-white" : "text-gray-500"}`}>{tab.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList data={filteredUsers} renderItem={renderUserItem} keyExtractor={(item) => item.id.toString()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />} />
    </View>
  );
}
