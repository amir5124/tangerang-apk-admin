import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { Download, LogOut, Phone, Search, Store, UserCheck } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Modal, Platform,
  Pressable, RefreshControl, Text, TextInput, View
} from "react-native";
import Toast from "react-native-toast-message";
import * as XLSX from "xlsx";
import api from "../../src/utils/api";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

// ─── Helper: export XLSX ──────────────────────────────────────────────────────
const exportToXLSX = (data: any[], tab: string) => {
  if (data.length === 0) {
    Toast.show({ type: "info", text1: "Tidak ada data", text2: "Tidak ada pengguna untuk diekspor." });
    return;
  }

  const rows = data.map((u) => ({
    "ID": u.id,
    "Nama Lengkap": u.full_name || "",
    "Email": u.email || "",
    "No. Telepon": u.phone_number || "",
    "Role": u.role || "",
    "Nama Toko": u.store_name || "",
    "Status Toko": u.store_status || "",
    "Komisi (%)": u.commission_rate != null ? Number(u.commission_rate) : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-width kolom
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r: any) => String(r[key] ?? "").length)
    ) + 2,
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pengguna");

  const fileName = `pengguna_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(workbook, fileName);
    Toast.show({ type: "success", text1: "Berhasil", text2: "File Excel berhasil diunduh." });
  } else {
    Toast.show({
      type: "info",
      text1: "Export tersedia di web",
      text2: "Gunakan versi web untuk mengunduh Excel.",
    });
  }
};

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "admin" | "mitra" | "customer">("all");
  const [users, setUsers] = useState<any[]>([]);

  // ─── State: Modal Edit Komisi ─────────────────────────────────────────────
  const [commissionModal, setCommissionModal] = useState(false);
  const [selectedMitra, setSelectedMitra] = useState<any>(null);
  const [commissionInput, setCommissionInput] = useState("");
  const [isSavingCommission, setIsSavingCommission] = useState(false);

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

  const executeApprove = async (storeId: number) => {
    try {
      const response = await api.put(`/mitra/approve/${storeId}`);
      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Berhasil",
          text2: response.data.message || "Mitra telah disetujui",
        });
        fetchUsers();
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Gagal",
        text2: error.response?.data?.message || "Terjadi kesalahan server",
      });
    }
  };

  const handleApproveMitra = (storeId: number, storeName: string) => {
    if (!storeId) {
      Toast.show({ type: "error", text1: "Error", text2: "ID Toko tidak ditemukan" });
      return;
    }

    if (Platform.OS === "web") {
      const confirmWeb = window.confirm(`Setujui ${storeName} sebagai mitra resmi?`);
      if (confirmWeb) executeApprove(storeId);
    } else {
      Alert.alert("Konfirmasi", `Setujui ${storeName} sebagai mitra resmi?`, [
        { text: "Batal", style: "cancel" },
        { text: "Ya, Setujui", onPress: () => executeApprove(storeId) },
      ]);
    }
  };

  // ─── Handler: Buka Modal Komisi ───────────────────────────────────────────
  const handleOpenCommission = (item: any) => {
    setSelectedMitra(item);
    setCommissionInput(
      item.commission_rate != null ? String(parseInt(item.commission_rate)) : "70"
    );
    setCommissionModal(true);
  };

  // ─── Handler: Simpan Komisi — update state lokal agar langsung tampil ─────
  const handleSaveCommission = async () => {
    const rate = parseFloat(commissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Toast.show({ type: "error", text1: "Input tidak valid", text2: "Masukkan angka antara 0 dan 100." });
      return;
    }
    if (!selectedMitra?.store_id) {
      Toast.show({ type: "error", text1: "Error", text2: "ID toko tidak ditemukan." });
      return;
    }

    setIsSavingCommission(true);
    try {
      const res = await api.put(`/mitra/${selectedMitra.store_id}/commission`, {
        commission_rate: rate,
      });
      if (res.data.success) {
        Toast.show({
          type: "success",
          text1: "Berhasil",
          text2: `Komisi ${selectedMitra.store_name} diperbarui ke ${rate}%`,
        });
        // Langsung update state lokal — badge berubah instan tanpa re-fetch
        setUsers((prev) =>
          prev.map((u) =>
            u.store_id === selectedMitra.store_id
              ? { ...u, commission_rate: rate }
              : u
          )
        );
        setCommissionModal(false);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Gagal",
        text2: error.response?.data?.message || "Terjadi kesalahan server",
      });
    } finally {
      setIsSavingCommission(false);
    }
  };

  const handleLogout = () => {
    const logoutAction = async () => {
      await AsyncStorage.removeItem("token");
      router.replace("/(auth)/login");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Apakah Anda yakin ingin keluar?")) logoutAction();
    } else {
      Alert.alert("Konfirmasi Logout", "Apakah Anda yakin ingin keluar?", [
        { text: "Batal", style: "cancel" },
        { text: "Keluar", style: "destructive", onPress: logoutAction },
      ]);
    }
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

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  const renderUserItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-[10px] mb-4 mx-4">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-slate-500 justify-center items-center">
          <Text className="text-white font-bold text-lg">{getInitials(item.full_name || "NA")}</Text>
        </View>
        <View className="flex-1 ml-4">
          <Text className="text-gray-800 font-bold text-base">{item.full_name}</Text>
          <Text className="text-gray-400 text-xs">{item.email}</Text>
          <View className="flex flex-row items-center mt-1">
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
          <View className="flex-row items-center flex-1 mr-2">
            <Store size={14} color="#64748b" />
            <View className="ml-2">
              <Text className="text-xs font-bold text-gray-700">{item.store_name || "-"}</Text>
              <Text className={`text-[10px] font-bold ${item.store_status === "approved" ? "text-green-600" : "text-orange-500"}`}>
                {item.store_status?.toUpperCase() || "PENDING"}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 items-center">
            {/* Badge komisi — reaktif terhadap state lokal */}
            <Pressable
              onPress={() => handleOpenCommission(item)}
              className="bg-purple-50 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1"
            >
              <Text className="text-[11px] font-bold text-[#633594]">
                {item.commission_rate != null
                  ? `${parseFloat(item.commission_rate)}%`
                  : "70%"}
              </Text>
              <Text className="text-[9px] text-[#633594]">KOMISI</Text>
            </Pressable>

            {item.store_status !== "approved" && (
              <Pressable
                onPress={() => handleApproveMitra(item.store_id, item.store_name)}
                className="bg-green-50 p-2.5 rounded-xl active:bg-green-100"
              >
                <UserCheck size={18} color="#16a34a" />
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <View className="bg-white px-4 pt-12 pb-6 mb-4">
        <View className="flex-row justify-between items-start mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-800">Kontrol Pengguna</Text>
            <Text className="text-gray-400 text-sm">Kelola dan approval status</Text>
          </View>

          <View className="flex-row gap-2 items-center">
            {/* Tombol Export XLSX */}
            <Pressable
              onPress={() => exportToXLSX(filteredUsers, activeTab)}
              className="p-2.5 bg-purple-50 rounded-2xl active:bg-purple-100"
            >
              <Download size={22} color="#633594" />
            </Pressable>

            <Pressable onPress={handleLogout} className="p-2.5 bg-red-50 rounded-2xl active:bg-red-100">
              <LogOut size={22} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        <View className="flex-row bg-[#F5F7FA] rounded-2xl px-4 py-3 items-center">
          <Search size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-gray-700"
            placeholder="Cari nama atau email..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tab Filter */}
      <View className="flex-row px-6 mb-4 gap-2">
        {["all", "admin", "mitra", "customer"].map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-[10px] ${activeTab === tab ? "bg-slate-800" : "bg-white border border-gray-200"}`}
          >
            <Text className={`text-[10px] font-bold ${activeTab === tab ? "text-white" : "text-gray-500"}`}>
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />}
      />

      {/* ─── Modal Edit Komisi ─────────────────────────────────────────────── */}
      <Modal visible={commissionModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-bold text-gray-800 mb-1">Atur Komisi Mitra</Text>
            <Text className="text-sm text-gray-400 mb-5">
              {selectedMitra?.store_name || "-"} · Sisa profit masuk ke aplikasi
            </Text>

            <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Persentase Komisi Mitra (%)</Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-100 px-4 mb-2">
              <TextInput
                className="flex-1 py-3 text-[#633594] font-bold text-lg"
                keyboardType="decimal-pad"
                value={commissionInput}
                onChangeText={setCommissionInput}
                placeholder="70"
                maxLength={5}
              />
              <Text className="text-gray-400 font-bold text-base">%</Text>
            </View>

            {/* Preview bagi hasil */}
            {commissionInput !== "" && !isNaN(parseFloat(commissionInput)) && (
              <View className="flex-row gap-2 mb-5">
                <View className="flex-1 bg-purple-50 rounded-xl p-3 items-center">
                  <Text className="text-[10px] text-[#633594] font-bold">MITRA</Text>
                  <Text className="text-base font-black text-[#633594]">{parseFloat(commissionInput) || 0}%</Text>
                </View>
                <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                  <Text className="text-[10px] text-gray-400 font-bold">APLIKASI</Text>
                  <Text className="text-base font-black text-gray-600">
                    {Math.max(0, 100 - (parseFloat(commissionInput) || 0))}%
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setCommissionModal(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
              >
                <Text className="font-bold text-gray-600">Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveCommission}
                disabled={isSavingCommission}
                className={`flex-1 py-3 rounded-xl items-center ${isSavingCommission ? "bg-gray-300" : "bg-[#633594]"}`}
              >
                <Text className="font-bold text-white">
                  {isSavingCommission ? "Menyimpan..." : "Simpan"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}