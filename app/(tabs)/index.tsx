import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  ArrowRightLeft,
  Download,
  Info,
  Landmark,
  Layers,
  Search, ShoppingBag, TrendingUp, Wallet
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal, Platform,
  ScrollView, Text, TextInput,
  TouchableOpacity, View
} from "react-native";
import * as XLSX from "xlsx"; // Pastikan sudah install: npm install xlsx
import { orderService } from "../../src/services/orderService";
import { Order } from "../../src/types/order";

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

export default function DashboardScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false); // State untuk loading export
  const [search, setSearch] = useState("");
  const [selectedMitra, setSelectedMitra] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // State untuk Modal Konfirmasi
  const [showExportModal, setShowExportModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrdersAdmin();
      if (res && res.success) setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const filteredData = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toString().includes(search);
      const matchesMitra = selectedMitra ? o.mitra_name === selectedMitra : true;

      const matchesStatus = selectedStatus
        ? (selectedStatus === "success" ? (o.payment_status === "settlement" || o.status === "completed") :
          selectedStatus === "pending" ? (o.payment_status === "pending") :
            selectedStatus === "failed" ? (o.payment_status === "expire" || o.payment_status === "cancel" || o.payment_status === "failed") : true)
        : true;

      return matchesSearch && matchesMitra && matchesStatus;
    });
  }, [orders, search, selectedMitra, selectedStatus]);

  const stats = useMemo(() => {
    const completed = filteredData.filter(
      (o) => o.payment_status === "settlement" || o.status === "completed"
    );

    const omset = completed.reduce((sum, o) => sum + parseFloat(o.total_price || "0"), 0);
    const totalPFee = completed.reduce((sum, o) => sum + parseFloat(o.platform_fee || "0"), 0);
    const totalSFee = completed.reduce((sum, o) => sum + parseFloat(o.service_fee || "0"), 0);

    const jatahVendor = omset * 0.7;
    const jatahAplikator = omset * 0.3;
    const netProfit = jatahAplikator + totalPFee;

    return {
      omset: formatRupiah(omset),
      laba: formatRupiah(netProfit),
      pFee: formatRupiah(totalPFee),
      sFee: formatRupiah(totalSFee),
      vendorShare: formatRupiah(jatahVendor),
      appShare: formatRupiah(jatahAplikator),
      count: completed.length,
    };
  }, [filteredData]);

  // --- FUNGSI EXPORT EXCEL (EKSEKUSI) ---
  const executeExport = async () => {
    setShowExportModal(false);

    // Pemetaan Status sesuai instruksi Anda
    const getStatusLabel = (status: string) => {
      switch (status) {
        case "unpaid": return "MENUNGGU PEMBAYARAN";
        case "accepted": return "DITERIMA";
        case "on_the_way": return "DI PERJALANAN";
        case "working": return "SEDANG DIKERJAKAN";
        case "completed": return "SELESAI";
        case "cancelled": return "DIBATALKAN";
        default: return status ? status.toUpperCase() : "-";
      }
    };

    const exportData = filteredData
      .filter((o) => o.payment_status === "settlement" || o.status === "completed")
      .map((o) => {
        const omset = parseFloat(o.total_price || "0");
        const pFee = parseFloat(o.platform_fee || "0");
        const sFee = parseFloat(o.service_fee || "0");

        // Logika pembagian sesuai gambar & stats
        const feeVendor = omset * 0.7;
        const feePlatform = omset * 0.3;
        const labaBersih = feePlatform + pFee;

        return {
          "Tanggal": o.order_date,
          "Customer": o.customer_name,
          "Vendor/Mitra": o.mitra_name,
          "ID Order": o.id,
          "Total Harga": omset,
          "Fee 70% Vendor": feeVendor,
          "Fee 30% Platform": feePlatform,
          "Platform Fee": pFee,
          "Service Fee": sFee,
          "Status": getStatusLabel(o.status),
          "Keterangan": o.customer_notes || "-", // Diambil dari notes jika ada
          "Laba Bersih": labaBersih,
        };
      });

    if (exportData.length === 0) {
      return Alert.alert("Info", "Tidak ada transaksi sukses untuk diekspor.");
    }

    setIsExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Mengatur lebar kolom agar rapi
      const wscols = [
        { wch: 20 }, // Tanggal
        { wch: 20 }, // Customer
        { wch: 20 }, // Mitra
        { wch: 10 }, // ID
        { wch: 15 }, // Total
        { wch: 15 }, // Fee 70
        { wch: 15 }, // Fee 30
        { wch: 15 }, // Pfee
        { wch: 15 }, // Sfee
        { wch: 15 }, // Status
        { wch: 25 }, // Keterangan
        { wch: 15 }, // Laba
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");

      const filename = `Laporan_TangerangFast_${Date.now()}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, filename);
      } else {
        const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        const uri = (FileSystem as any).documentDirectory + filename;

        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: (FileSystem as any).EncodingType.Base64,
        });

        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Gagal", "Terjadi kesalahan saat mengekspor data.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F9FD]">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  return (
    <View className="flex-1 bg-[#F8F9FD]">

      {/* MODAL TOAST KONFIRMASI EKSPOR */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showExportModal}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[40px] p-8 shadow-2xl">
            <View className="items-center mb-6">
              <View className="w-16 h-1.5 bg-gray-200 rounded-full mb-6" />
              <View className="bg-purple-100 p-4 rounded-full mb-4">
                <Download size={32} color="#633594" />
              </View>
              <Text className="text-xl font-black text-gray-900">Konfirmasi Ekspor</Text>
              <Text className="text-gray-500 text-center mt-2 px-4">
                Anda akan mengekspor <Text className="font-bold text-purple-700">{stats.count}</Text> data transaksi yang terpilih ke format Excel (.xlsx)
              </Text>
            </View>

            <View className="flex-row space-x-4">
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
              >
                <Text className="text-gray-600 font-bold">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={executeExport}
                className="flex-1 bg-[#633594] py-4 rounded-2xl items-center"
              >
                <Text className="text-white font-bold">Ya, Ekspor Sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HEADER SECTION */}
      <View className="px-6 pt-14 pb-10 bg-[#633594] rounded-b-[45px]">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-white/60 text-xs font-bold uppercase tracking-widest">
              Administrator
            </Text>
            <Text className="text-white text-2xl font-black">Dashboard</Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              className="bg-white/20 p-3 rounded-2xl mr-2"
              onPress={() => setShowExportModal(true)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Download size={22} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white/20 p-3 rounded-2xl"
              onPress={() => router.push("/withdraw" as any)}
            >
              <Landmark size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row bg-white/15 border border-white/10 rounded-[20px] px-4 py-3 items-center">
          <Search size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            className="ml-3 flex-1 text-white text-sm font-medium"
            placeholder="Cari transaksi..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-5 -mt-6" showsVerticalScrollIndicator={false}>
        {/* TOP STATS GRID */}
        <View className="flex-row flex-wrap justify-between">
          <View className="bg-[#22C55E] p-5 rounded-[30px] w-[48%] mb-4">
            <View className="bg-white/20 self-start p-2 rounded-xl mb-3">
              <TrendingUp size={18} color="white" />
            </View>
            <Text className="text-white/70 text-[10px] font-bold uppercase">Total Omset</Text>
            <Text className="text-white text-lg font-black mt-1">{stats.omset}</Text>
          </View>

          <View className="bg-white p-5 rounded-[30px] w-[48%] mb-4 border border-gray-100">
            <View className="bg-purple-50 self-start p-2 rounded-xl mb-3">
              <Wallet size={18} color="#633594" />
            </View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase">Laba Bersih</Text>
            <Text className="text-gray-900 text-lg font-black mt-1">{stats.laba}</Text>
          </View>

          <View className="bg-white p-5 rounded-[30px] w-[48%] mb-4 border border-gray-100">
            <View className="bg-blue-50 self-start p-2 rounded-xl mb-3">
              <Layers size={18} color="#3B82F6" />
            </View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase">Platform Fee</Text>
            <Text className="text-gray-900 text-lg font-black mt-1">{stats.pFee}</Text>
          </View>

          <View className="bg-white p-5 rounded-[30px] w-[48%] mb-4 border border-gray-100">
            <View className="bg-orange-50 self-start p-2 rounded-xl mb-3">
              <ShoppingBag size={18} color="#F59E0B" />
            </View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase">Sukses</Text>
            <Text className="text-gray-900 text-lg font-black mt-1">{stats.count}</Text>
          </View>
        </View>

        {/* SECTION: RINGKASAN PEMBAGIAN LABA */}
        <View className="bg-white p-6 rounded-[35px] mb-6 border border-gray-100">
          <View className="flex-row items-center mb-5">
            <View className="bg-purple-600 p-2 rounded-lg">
              <Info size={16} color="white" />
            </View>
            <Text className="ml-3 text-gray-900 font-black text-base">Alokasi Pendapatan</Text>
          </View>

          <View className="flex-row justify-between mb-4 pb-4 border-b border-gray-50">
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Vendor (70%)</Text>
              <Text className="text-gray-900 font-bold">{stats.vendorShare}</Text>
            </View>
            <View className="items-center justify-center px-4">
              <ArrowRightLeft size={14} color="#CBD5E1" />
            </View>
            <View className="flex-1 items-end">
              <Text className="text-purple-600 text-[10px] font-bold uppercase mb-1">Aplikator (30%)</Text>
              <Text className="text-purple-700 font-bold">{stats.appShare}</Text>
            </View>
          </View>

          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-500 text-xs">Total Platform Fee</Text>
              <Text className="text-gray-900 font-bold text-xs">{stats.pFee}</Text>
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-xs">Biaya Admin PG</Text>
                <View className="ml-1 px-1.5 py-0.5 bg-blue-50 rounded">
                  <Text className="text-[8px] text-blue-600 font-bold uppercase">Customer</Text>
                </View>
              </View>
              <Text className="text-blue-600 font-bold text-xs">{stats.sFee}</Text>
            </View>
          </View>

          <View className="mt-5 p-4 bg-gray-50 rounded-2xl flex-row justify-between items-center">
            <Text className="text-gray-900 font-black text-xs">ESTIMASI LABA BERSIH</Text>
            <Text className="text-[#633594] font-black text-lg">{stats.laba}</Text>
          </View>
        </View>

        {/* VENDOR FILTER */}
        <View className="flex-row justify-between items-center mt-2 mb-4 px-1">
          <Text className="text-gray-900 font-black text-base">Filter Vendor</Text>
          <TouchableOpacity onPress={() => setSelectedMitra(null)}>
            <Text className="text-purple-600 text-xs font-bold">Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <TouchableOpacity
            onPress={() => setSelectedMitra(null)}
            className={`px-6 py-3 rounded-2xl mr-3 ${!selectedMitra ? "bg-[#633594]" : "bg-white border border-gray-100"}`}
          >
            <Text className={`text-xs font-bold ${!selectedMitra ? "text-white" : "text-gray-500"}`}>
              Semua Mitra
            </Text>
          </TouchableOpacity>
          {Array.from(new Set(orders.map((o) => o.mitra_name))).map((m, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedMitra(m)}
              className={`px-6 py-3 rounded-2xl mr-3 ${selectedMitra === m ? "bg-[#633594]" : "bg-white border border-gray-100"}`}
            >
              <Text className={`text-xs font-bold ${selectedMitra === m ? "text-white" : "text-gray-500"}`}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STATUS FILTER */}
        <View className="flex-row justify-between items-center mt-2 mb-4 px-1">
          <Text className="text-gray-900 font-black text-base">Filter Status</Text>
        </View>

        <View className="flex-row mb-6">
          {[
            { id: null, label: "Semua", color: "bg-gray-500" },
            { id: "success", label: "Sukses", color: "bg-green-600" },
            { id: "pending", label: "Pending", color: "bg-orange-500" },
            { id: "failed", label: "Gagal", color: "bg-red-600" },
          ].map((status) => (
            <TouchableOpacity
              key={status.label}
              onPress={() => setSelectedStatus(status.id)}
              className={`px-4 py-2 rounded-xl mr-2 border ${selectedStatus === status.id ? "bg-[#633594] border-[#633594]" : "bg-white border-gray-100"
                }`}
            >
              <Text className={`text-[10px] font-bold ${selectedStatus === status.id ? "text-white" : "text-gray-500"}`}>
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* RECENT ACTIVITY LIST */}
        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="text-lg font-black text-gray-900">Recent Activity</Text>

        </View>

        <View className="mb-10">
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
              <View key={item.id} className="bg-white p-4 rounded-[28px] mb-3 flex-row items-center border border-gray-50">
                <View className={`w-12 h-12 rounded-full items-center justify-center ${item.status === "completed" ? "bg-green-50" : "bg-purple-50"}`}>
                  <Text className={`font-black text-xs ${item.status === "completed" ? "text-green-600" : "text-purple-600"}`}>
                    {item.customer_name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>

                <View className="ml-4 flex-1">
                  <Text className="font-bold text-gray-900 text-sm" numberOfLines={1}>
                    {item.customer_name}
                  </Text>
                  <Text className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{item.mitra_name}</Text>
                </View>

                <View className="items-end">
                  <Text className="font-black text-gray-900 text-sm">
                    {formatRupiah(parseFloat(item.total_price))}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-md mt-1 ${item.status === "accepted" ? "bg-blue-100" :
                      item.status === "on_the_way" ? "bg-purple-100" :
                        item.status === "working" ? "bg-orange-100" :
                          item.status === "completed" ? "bg-green-100" :
                            item.status === "cancelled" ? "bg-red-100" : "bg-gray-100"
                    }`}>
                    <Text className={`text-[8px] font-bold uppercase ${item.status === "accepted" ? "text-blue-700" :
                        item.status === "on_the_way" ? "text-purple-700" :
                          item.status === "working" ? "text-orange-700" :
                            item.status === "completed" ? "text-green-700" :
                              item.status === "cancelled" ? "text-red-700" : "text-gray-700"
                      }`}>
                      {
                        item.status === "accepted" ? "DITERIMA" :
                          item.status === "on_the_way" ? "DI PERJALANAN" :
                            item.status === "working" ? "DIPROSES" :
                              item.status === "completed" ? "SELESAI" :
                                item.status === "cancelled" ? "BATAL" : (item.status || "-").toUpperCase()
                      }
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-center text-gray-400 py-10">Tidak ada transaksi ditemukan</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}