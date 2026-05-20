import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { AlertTriangle, Download, LogOut, Phone, RefreshCw, Search, Store, UserCheck, Users, XCircle } from "lucide-react-native";
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
    "Alasan Penolakan": u.rejection_reason || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? "").length)) + 2,
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pengguna");

  const fileName = `pengguna_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(workbook, fileName);
    Toast.show({ type: "success", text1: "Berhasil", text2: "File Excel berhasil diunduh." });
  } else {
    Toast.show({ type: "info", text1: "Export tersedia di web", text2: "Gunakan versi web untuk mengunduh Excel." });
  }
};

export default function AdminUserList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "admin" | "mitra" | "customer">("all");
  const [users, setUsers] = useState<any[]>([]);

  const [commissionModal, setCommissionModal] = useState(false);
  const [selectedMitra, setSelectedMitra] = useState<any>(null);
  const [commissionInput, setCommissionInput] = useState("");
  const [isSavingCommission, setIsSavingCommission] = useState(false);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectMitra, setRejectMitra] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [revertModal, setRevertModal] = useState(false);
  const [revertMitra, setRevertMitra] = useState<any>(null);
  const [isReverting, setIsReverting] = useState(false);

  const [changeStatusModal, setChangeStatusModal] = useState(false);
  const [changeStatusMitra, setChangeStatusMitra] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<"pending" | "rejected">("pending");
  const [changeStatusReason, setChangeStatusReason] = useState("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);

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

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCustomer = users.filter((u) => u.role === "customer").length;
    const totalMitraAktif = users.filter((u) => u.role === "mitra" && u.store_status === "approved").length;
    return { totalCustomer, totalMitraAktif };
  }, [users]);

  const getStoreId = (item: any): number | null => {
    if (item?.store_id && typeof item.store_id === 'number') return item.store_id;
    if (item?.store_id && typeof item.store_id === 'string') return parseInt(item.store_id);
    if (item?.id && item.role === 'mitra' && !item.store_id) return null;
    if (item?.id && typeof item.id === 'number') return item.id;
    return null;
  };

  const hasStore = (item: any): boolean => {
    return !!(item?.store_id && item.store_id > 0);
  };

  const executeApprove = async (storeId: number) => {
    if (!storeId) {
      Toast.show({ type: "error", text1: "Error", text2: "ID Toko tidak ditemukan" });
      return;
    }
    try {
      const response = await api.put(`/mitra/approve/${storeId}`);
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: response.data.message || "Mitra telah disetujui" });
        fetchUsers();
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan server" });
    }
  };

  const createStoreAndApprove = async (userId: number, fullName: string) => {
    try {
      const response = await api.post("/mitra/create-store-from-user", {
        user_id: userId,
        store_name: fullName,
        category: "pending",
        approval_status: "approved"
      });
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: "Store berhasil dibuat dan mitra disetujui" });
        fetchUsers();
        return response.data.data.store_id;
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Gagal membuat store" });
      return null;
    }
  };

  const executeRejectUser = async (userId: number, reason: string) => {
    try {
      const response = await api.put(`/mitra/reject-mitra-user/${userId}`, { rejection_reason: reason });
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: "Pendaftaran mitra ditolak" });
        fetchUsers();
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan server" });
    }
  };

  // ── executeReject: sekarang selalu pakai modal, loading state lengkap ──────
  const executeReject = async () => {
    if (!rejectMitra) return;
    const storeId = getStoreId(rejectMitra);

    setIsRejecting(true);
    try {
      if (!hasStore(rejectMitra)) {
        await executeRejectUser(rejectMitra.id, rejectionReason.trim() || "Tidak ada alasan yang diberikan");
      } else {
        if (!storeId) {
          Toast.show({ type: "error", text1: "Error", text2: "ID Toko tidak ditemukan" });
          return;
        }
        const response = await api.put(`/mitra/reject/${storeId}`, {
          rejection_reason: rejectionReason.trim() || "Tidak ada alasan yang diberikan",
        });
        if (response.data.success) {
          Toast.show({ type: "success", text1: "Berhasil", text2: response.data.message || "Mitra telah ditolak" });
          fetchUsers();
        }
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan server" });
    } finally {
      setIsRejecting(false);
      setRejectModal(false);
      setRejectionReason("");
      setRejectMitra(null);
    }
  };

  // ── handleRejectMitra: selalu buka modal (tidak pakai Alert/prompt) ────────
  const handleRejectMitra = (item: any) => {
    setRejectMitra(item);
    setRejectionReason("");
    setRejectModal(true);
  };

  const executeRevertToPending = async () => {
    if (!revertMitra) return;
    const storeId = getStoreId(revertMitra);

    if (!storeId) {
      Toast.show({ type: "error", text1: "Error", text2: "ID Toko tidak ditemukan" });
      return;
    }

    setIsReverting(true);
    try {
      const response = await api.put(`/mitra/revert-rejected-to-pending/${storeId}`);
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: response.data.message || "Mitra dikembalikan ke status pending" });
        setRevertModal(false);
        setRevertMitra(null);
        fetchUsers();
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan server" });
    } finally {
      setIsReverting(false);
    }
  };

  const handleRevertToPending = (item: any) => {
    if (Platform.OS === "web") {
      const confirmWeb = window.confirm(`Kembalikan ${item.store_name} ke status pending? Mitra dapat mengajukan ulang pendaftaran.`);
      if (confirmWeb) executeRevertToPending();
    } else {
      setRevertMitra(item);
      setRevertModal(true);
    }
  };

  const executeChangeStatus = async () => {
    if (!changeStatusMitra) return;
    const storeId = getStoreId(changeStatusMitra);

    if (!storeId) {
      Toast.show({ type: "error", text1: "Error", text2: "ID Toko tidak ditemukan" });
      return;
    }

    setIsChangingStatus(true);
    try {
      let response;
      if (newStatus === "rejected") {
        response = await api.put(`/mitra/reject/${storeId}`, { rejection_reason: changeStatusReason.trim() || "Status diubah oleh admin" });
      } else {
        response = await api.put(`/mitra/revert-approved-to-pending/${storeId}`, { rejection_reason: changeStatusReason.trim() || "Ditarik oleh admin untuk verifikasi ulang" });
      }
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: `Status mitra diubah menjadi ${newStatus === "rejected" ? "DITOLAK" : "PENDING"}` });
        setChangeStatusModal(false);
        setChangeStatusMitra(null);
        setChangeStatusReason("");
        fetchUsers();
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan server" });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleChangeStatus = (item: any, status: "pending" | "rejected") => {
    setChangeStatusMitra(item);
    setNewStatus(status);
    setChangeStatusReason("");
    setChangeStatusModal(true);
  };

  const handleApproveMitra = async (item: any) => {
    const storeId = getStoreId(item);

    if (!hasStore(item)) {
      Alert.alert("Konfirmasi", `${item.full_name} belum memiliki data toko. Buat toko dan setujui?`, [
        { text: "Batal", style: "cancel" },
        { text: "Lanjutkan", onPress: () => createStoreAndApprove(item.id, item.full_name) }
      ]);
      return;
    }

    if (!storeId) {
      Toast.show({ type: "error", text1: "Error", text2: "ID Toko tidak ditemukan" });
      return;
    }

    if (Platform.OS === "web") {
      const confirmWeb = window.confirm(`Setujui ${item.store_name} sebagai mitra resmi?`);
      if (confirmWeb) executeApprove(storeId);
    } else {
      Alert.alert("Konfirmasi", `Setujui ${item.store_name} sebagai mitra resmi?`, [
        { text: "Batal", style: "cancel" },
        { text: "Ya, Setujui", onPress: () => executeApprove(storeId) },
      ]);
    }
  };

  const handleOpenCommission = (item: any) => {
    setSelectedMitra(item);
    setCommissionInput(item.commission_rate != null ? String(parseInt(item.commission_rate)) : "70");
    setCommissionModal(true);
  };

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
      const res = await api.put(`/mitra/${selectedMitra.store_id}/commission`, { commission_rate: rate });
      if (res.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: `Komisi ${selectedMitra.store_name} diperbarui ke ${rate}%` });
        setUsers((prev) => prev.map((u) => u.store_id === selectedMitra.store_id ? { ...u, commission_rate: rate } : u));
        setCommissionModal(false);
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan server" });
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

  useFocusEffect(React.useCallback(() => { fetchUsers(); }, []));

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === "all" || u.role === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [users, search, activeTab]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-green-600";
      case "rejected": return "text-red-600";
      case "pending_registration": return "text-purple-600";
      default: return "text-orange-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "DISETUJUI";
      case "rejected": return "DITOLAK";
      case "pending_registration": return "BELUM DAFTAR TOKO";
      default: return "PENDING";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-50";
      case "rejected": return "bg-red-50";
      case "pending_registration": return "bg-purple-50";
      default: return "bg-orange-50";
    }
  };

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
        <View className="border-t border-gray-50 pt-4 mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <Store size={14} color="#64748b" />
              <View className="ml-2">
                <Text className="text-xs font-bold text-gray-700">{item.store_name || item.full_name || "-"}</Text>
                <View className="flex-row items-center mt-1">
                  <View className={`px-2 py-0.5 rounded-full ${getStatusBg(item.store_status)}`}>
                    <Text className={`text-[10px] font-bold ${getStatusColor(item.store_status)}`}>
                      {getStatusLabel(item.store_status)}
                    </Text>
                  </View>
                </View>
                {item.rejection_reason && item.store_status === "rejected" && (
                  <Text className="text-[10px] text-red-400 mt-1" numberOfLines={2}>
                    Alasan: {item.rejection_reason}
                  </Text>
                )}
              </View>
            </View>

            {hasStore(item) && (
              <View className="flex-row gap-2 items-center">
                <Pressable onPress={() => handleOpenCommission(item)} className="bg-purple-50 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1">
                  <Text className="text-[11px] font-bold text-[#633594]">{item.commission_rate != null ? `${parseFloat(item.commission_rate)}%` : "70%"}</Text>
                  <Text className="text-[9px] text-[#633594]">KOMISI</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap gap-2">
            {(item.store_status === "pending" || item.store_status === "pending_registration" || !item.store_status) && (
              <Pressable onPress={() => handleApproveMitra(item)} className="flex-1 bg-green-50 py-2.5 rounded-xl flex-row items-center justify-center gap-2">
                <UserCheck size={16} color="#16a34a" />
                <Text className="text-xs font-bold text-green-600">SETUJUI</Text>
              </Pressable>
            )}

            {(item.store_status === "pending" || item.store_status === "pending_registration" || !item.store_status) && (
              <Pressable onPress={() => handleRejectMitra(item)} className="flex-1 bg-red-50 py-2.5 rounded-xl flex-row items-center justify-center gap-2">
                <XCircle size={16} color="#dc2626" />
                <Text className="text-xs font-bold text-red-600">TOLAK</Text>
              </Pressable>
            )}

            {item.store_status === "approved" && (
              <>
                <Pressable onPress={() => handleChangeStatus(item, "pending")} className="flex-1 bg-orange-50 py-2.5 rounded-xl flex-row items-center justify-center gap-2">
                  <RefreshCw size={16} color="#ea580c" />
                  <Text className="text-xs font-bold text-orange-600">UBAH KE PENDING</Text>
                </Pressable>
                <Pressable onPress={() => handleChangeStatus(item, "rejected")} className="flex-1 bg-red-50 py-2.5 rounded-xl flex-row items-center justify-center gap-2">
                  <XCircle size={16} color="#dc2626" />
                  <Text className="text-xs font-bold text-red-600">UBAH KE TOLAK</Text>
                </Pressable>
              </>
            )}

            {item.store_status === "rejected" && hasStore(item) && (
              <Pressable onPress={() => handleRevertToPending(item)} className="flex-1 bg-orange-50 py-2.5 rounded-xl flex-row items-center justify-center gap-2">
                <RefreshCw size={16} color="#ea580c" />
                <Text className="text-xs font-bold text-orange-600">KEMBALIKAN KE PENDING</Text>
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
            <Pressable onPress={() => exportToXLSX(filteredUsers, activeTab)} className="p-2.5 bg-purple-50 rounded-2xl active:bg-purple-100">
              <Download size={22} color="#633594" />
            </Pressable>
            <Pressable onPress={handleLogout} className="p-2.5 bg-red-50 rounded-2xl active:bg-red-100">
              <LogOut size={22} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* ── Stats Cards ── */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-blue-50 rounded-2xl px-4 py-3 flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-full bg-blue-100 justify-center items-center">
              <Users size={18} color="#2563eb" />
            </View>
            <View>
              <Text className="text-[10px] font-bold text-blue-400 uppercase">Customer</Text>
              <Text className="text-xl font-black text-blue-600">{stats.totalCustomer}</Text>
            </View>
          </View>
          <View className="flex-1 bg-green-50 rounded-2xl px-4 py-3 flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-full bg-green-100 justify-center items-center">
              <Store size={18} color="#16a34a" />
            </View>
            <View>
              <Text className="text-[10px] font-bold text-green-400 uppercase">Mitra Aktif</Text>
              <Text className="text-xl font-black text-green-600">{stats.totalMitraAktif}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row bg-[#F5F7FA] rounded-2xl px-4 py-3 items-center">
          <Search size={20} color="#94a3b8" />
          <TextInput className="flex-1 ml-3 text-sm text-gray-700" placeholder="Cari nama atau email..." value={search} onChangeText={setSearch} />
        </View>
      </View>

      <View className="flex-row px-6 mb-4 gap-2 flex-wrap">
        {["all", "admin", "mitra", "customer"].map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-[10px] ${activeTab === tab ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
            <Text className={`text-[10px] font-bold ${activeTab === tab ? "text-white" : "text-gray-500"}`}>{tab.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList data={filteredUsers} renderItem={renderUserItem} keyExtractor={(item) => item.id.toString()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />} contentContainerStyle={{ paddingBottom: 20 }} />

      {/* ── Modal Tolak Pendaftaran (pakai Modal, bukan Alert/prompt) ── */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-white w-full rounded-3xl p-6">
            <View className="flex-row items-center gap-2 mb-2">
              <XCircle size={24} color="#dc2626" />
              <Text className="text-lg font-bold text-gray-800">Tolak Pendaftaran</Text>
            </View>
            <Text className="text-sm text-gray-400 mb-5">
              {rejectMitra?.store_name || rejectMitra?.full_name || "-"} · Berikan alasan penolakan
            </Text>
            <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Alasan Penolakan</Text>
            <View className="bg-gray-50 rounded-xl border border-gray-100 px-4 mb-5">
              <TextInput
                className="py-3 text-gray-700 min-h-[80px]"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Contoh: Data tidak lengkap, dokumen tidak valid, dll..."
                placeholderTextColor="#94a3b8"
                editable={!isRejecting}
              />
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => { setRejectModal(false); setRejectionReason(""); setRejectMitra(null); }}
                disabled={isRejecting}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
              >
                <Text className="font-bold text-gray-600">Batal</Text>
              </Pressable>
              <Pressable
                onPress={executeReject}
                disabled={isRejecting}
                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${isRejecting ? "bg-gray-300" : "bg-red-600"}`}
              >
                {isRejecting && <ActivityIndicator size="small" color="#fff" />}
                <Text className="font-bold text-white">{isRejecting ? "Memproses..." : "Tolak"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={revertModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-bold text-gray-800 mb-1">Kembalikan ke Pending</Text>
            <Text className="text-sm text-gray-400 mb-5">{revertMitra?.store_name || "-"}</Text>
            <View className="bg-orange-50 rounded-xl p-4 mb-5">
              <Text className="text-sm text-orange-700 text-center">Apakah Anda yakin ingin mengembalikan pendaftaran mitra ini ke status PENDING?</Text>
              <Text className="text-xs text-orange-600 text-center mt-2">Mitra dapat mengajukan ulang pendaftaran dengan memperbaiki data yang diminta.</Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable onPress={() => { setRevertModal(false); setRevertMitra(null); }} className="flex-1 py-3 bg-gray-100 rounded-xl items-center"><Text className="font-bold text-gray-600">Batal</Text></Pressable>
              <Pressable onPress={executeRevertToPending} disabled={isReverting} className={`flex-1 py-3 rounded-xl items-center ${isReverting ? "bg-gray-300" : "bg-orange-600"}`}><Text className="font-bold text-white">{isReverting ? "Memproses..." : "Ya, Kembalikan"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={changeStatusModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-white w-full rounded-3xl p-6">
            <View className="flex-row items-center gap-2 mb-2"><AlertTriangle size={24} color="#ea580c" /><Text className="text-lg font-bold text-gray-800">Ubah Status Mitra</Text></View>
            <Text className="text-sm text-gray-400 mb-5">{changeStatusMitra?.store_name || "-"} · Status saat ini: <Text className="font-bold text-green-600">DISETUJUI</Text></Text>
            <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Status Baru</Text>
            <View className="flex-row gap-3 mb-5">
              <Pressable onPress={() => setNewStatus("pending")} className={`flex-1 py-3 rounded-xl items-center ${newStatus === "pending" ? "bg-orange-500" : "bg-gray-100"}`}><Text className={`font-bold ${newStatus === "pending" ? "text-white" : "text-gray-600"}`}>PENDING</Text></Pressable>
              <Pressable onPress={() => setNewStatus("rejected")} className={`flex-1 py-3 rounded-xl items-center ${newStatus === "rejected" ? "bg-red-600" : "bg-gray-100"}`}><Text className={`font-bold ${newStatus === "rejected" ? "text-white" : "text-gray-600"}`}>DITOLAK</Text></Pressable>
            </View>
            {newStatus === "rejected" && (<><Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Alasan Perubahan</Text><View className="bg-gray-50 rounded-xl border border-gray-100 px-4 mb-5"><TextInput className="py-3 text-gray-700 min-h-[80px]" multiline numberOfLines={4} textAlignVertical="top" value={changeStatusReason} onChangeText={setChangeStatusReason} placeholder="Contoh: Melanggar ketentuan, komplain pelanggan, dll..." placeholderTextColor="#94a3b8" /></View></>)}
            {newStatus === "pending" && (<View className="bg-orange-50 rounded-xl p-3 mb-5"><Text className="text-xs text-orange-700 text-center">Mitra akan dikembalikan ke status PENDING dan dapat mengajukan ulang verifikasi.</Text></View>)}
            <View className="flex-row gap-3">
              <Pressable onPress={() => { setChangeStatusModal(false); setChangeStatusMitra(null); setChangeStatusReason(""); }} className="flex-1 py-3 bg-gray-100 rounded-xl items-center"><Text className="font-bold text-gray-600">Batal</Text></Pressable>
              <Pressable onPress={executeChangeStatus} disabled={isChangingStatus} className={`flex-1 py-3 rounded-xl items-center ${isChangingStatus ? "bg-gray-300" : newStatus === "rejected" ? "bg-red-600" : "bg-orange-600"}`}><Text className="font-bold text-white">{isChangingStatus ? "Memproses..." : "Konfirmasi"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={commissionModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-bold text-gray-800 mb-1">Atur Komisi Mitra</Text>
            <Text className="text-sm text-gray-400 mb-5">{selectedMitra?.store_name || "-"} · Sisa profit masuk ke aplikasi</Text>
            <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Persentase Komisi Mitra (%)</Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-100 px-4 mb-2">
              <TextInput className="flex-1 py-3 text-[#633594] font-bold text-lg" keyboardType="decimal-pad" value={commissionInput} onChangeText={setCommissionInput} placeholder="70" maxLength={5} />
              <Text className="text-gray-400 font-bold text-base">%</Text>
            </View>
            {commissionInput !== "" && !isNaN(parseFloat(commissionInput)) && (
              <View className="flex-row gap-2 mb-5">
                <View className="flex-1 bg-purple-50 rounded-xl p-3 items-center"><Text className="text-[10px] text-[#633594] font-bold">MITRA</Text><Text className="text-base font-black text-[#633594]">{parseFloat(commissionInput) || 0}%</Text></View>
                <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center"><Text className="text-[10px] text-gray-400 font-bold">APLIKASI</Text><Text className="text-base font-black text-gray-600">{Math.max(0, 100 - (parseFloat(commissionInput) || 0))}%</Text></View>
              </View>
            )}
            <View className="flex-row gap-3">
              <Pressable onPress={() => setCommissionModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center"><Text className="font-bold text-gray-600">Batal</Text></Pressable>
              <Pressable onPress={handleSaveCommission} disabled={isSavingCommission} className={`flex-1 py-3 rounded-xl items-center ${isSavingCommission ? "bg-gray-300" : "bg-[#633594]"}`}><Text className="font-bold text-white">{isSavingCommission ? "Menyimpan..." : "Simpan"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}