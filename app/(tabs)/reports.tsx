import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowDownCircle, Calendar, ChevronLeft, ChevronRight, Clock, Landmark, RefreshCcw, Search, TrendingUp } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { withAccess } from "../../src/components/withAccess";
import { orderService } from "../../src/services/orderService";
import { Order } from "../../src/types/order";
import API from "../../src/utils/api";

/** * API SERVICES */
const getWithdrawHistory = async () => {
  try {
    const response = await API.get("/withdraw/admin/all-history");
    return response.data;
  } catch (error: any) {
    return { success: false, data: [] };
  }
};

const getRefundHistory = async () => {
  try {
    const response = await API.get("/orders/admin/refund-history");
    return response.data;
  } catch (error: any) {
    return { success: false, data: [] };
  }
};

const formatRupiah = (number: any) => {
  const val = typeof number === "string" ? parseFloat(number) : number;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

function ReportsScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminFee, setAdminFee] = useState("0");

  // Filter States
  const [activeMainTab, setActiveMainTab] = useState("transaksi");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [resOrder, resWithdraw, resRefund] = await Promise.all([orderService.getAllOrdersAdmin(), getWithdrawHistory(), getRefundHistory()]);
      if (resOrder?.success) setOrders(resOrder.data);
      if (resWithdraw?.success) setWithdraws(resWithdraw.data);
      if (resRefund?.success) setRefunds(resRefund.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminFee = async () => {
    try {
      const res = await API.get("/disburse/withdraw_fee");
      if (res.data.success) setAdminFee(res.data.value);
    } catch (error) {
      console.error("Gagal ambil biaya admin");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      fetchAdminFee();
    }, []),
  );

  const adjustTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const date = new Date(dateString.replace(" ", "T") + "Z");
    return date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour12: false,
    });
  };

  // Logic Filtering Data
  const filteredData = useMemo(() => {
    let baseData = [];
    if (activeMainTab === "transaksi") baseData = orders;
    else if (activeMainTab === "withdraw") baseData = withdraws;
    else baseData = refunds;

    return baseData.filter((item: any) => {
      const name = (item.mitra_name || item.full_name || item.customer_name || "").toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase());

      const itemStatus = (item.status || "").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "sukses" && (itemStatus === "completed" || itemStatus === "success")) ||
        (statusFilter === "pending" && itemStatus === "pending") ||
        (statusFilter === "gagal" && (itemStatus === "cancelled" || itemStatus === "failed" || itemStatus === "rejected"));

      const itemDate = item.order_date || item.created_at || item.tanggal_refund;
      const matchesDate = !selectedDate || (itemDate && itemDate.includes(selectedDate));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [activeMainTab, orders, withdraws, refunds, searchQuery, statusFilter, selectedDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const totalRev = completed.reduce((sum, o) => sum + parseInt(o.total_price || "0"), 0);
    return {
      revenue: formatRupiah(totalRev),
      totalOrders: orders.length,
    };
  }, [orders]);

  // Export Excel Function
  // const handleExportExcel = async () => {
  //   try {
  //     const dataToExport = filteredData.map((item: any) => ({
  //       ID: item.id || item.order_id,
  //       Nama: item.mitra_name || item.full_name || item.customer_name,
  //       Tanggal: adjustTime(item.order_date || item.created_at || item.tanggal_refund),
  //       Status: item.status,
  //       Nominal: item.total_price || item.amount || item.nominal_refund,
  //     }));

  //     const ws = XLSX.utils.json_to_sheet(dataToExport);
  //     const wb = XLSX.utils.book_new();
  //     XLSX.utils.book_append_sheet(wb, ws, "Laporan");

  //     const fileName = `Laporan_${activeMainTab}_${new Date().getTime()}.xlsx`;

  //     if (Platform.OS === "web") {
  //       XLSX.writeFile(wb, fileName);
  //     } else {
  //       const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  //       const baseDir = FileSystem.documentDirectory;
  //       if (!baseDir) return alert("Sistem file tidak tersedia");

  //       const fileUri = baseDir + fileName;
  //       await FileSystem.writeAsStringAsync(fileUri, wbout, {
  //         encoding: FileSystem.EncodingType.Base64,
  //       });

  //       if (await Sharing.isAvailableAsync()) {
  //         await Sharing.shareAsync(fileUri);
  //       }
  //     }
  //   } catch (error) {
  //     alert("Terjadi kesalahan saat mengekspor data");
  //   }
  // };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const formatted = date.toISOString().split("T")[0];
      setSelectedDate(formatted);
      setCurrentPage(1);
    }
  };

  // Helper untuk merender Date Picker berdasarkan platform
  const RenderDatePicker = () => {
    if (Platform.OS === "web") {
      const WebInput = "input" as any;
      return (
        <WebInput
          type="date"
          value={selectedDate}
          onChange={(e: any) => {
            setSelectedDate(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid #f3f4f6",
            fontSize: "12px",
            backgroundColor: "#f9fafb",
            color: "#633594",
            outline: "none",
          }}
        />
      );
    }

    return (
      <TouchableOpacity onPress={() => setShowDatePicker(true)} className={`flex-row items-center px-3 py-1.5 rounded-lg ${selectedDate ? "bg-purple-100" : "bg-gray-50"}`}>
        <Calendar size={14} color={selectedDate ? "#633594" : "gray"} />
        <Text className={`text-xs ml-1 ${selectedDate ? "text-[#633594] font-bold" : "text-gray-500"}`}>{selectedDate || "Pilih Tanggal"}</Text>
      </TouchableOpacity>
    );
  };

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  return (
    <View className="flex-1 bg-white">
      <View className="px-4">
        <View className="bg-white pt-12 pb-6 mb-4 px-5">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-800">Kelola Laporan</Text>
              <Text className="text-gray-400 text-sm">Kelola laporan transaksi</Text>
            </View>

            {/* Tombol Tarik Saldo */}
            <TouchableOpacity
              onPress={() => router.push("/withdraw")}
              className="bg-[#633594] flex-row items-center gap-2 px-4 py-2.5 rounded-xl active:opacity-80 shadow-sm"
              activeOpacity={0.8}
            >
              <Landmark size={18} color="#fff" />
              <Text className="text-white font-bold text-sm">Tarik Saldo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mb-6">
          <Search size={18} color="gray" />
          <TextInput
            placeholder="Cari nama mitra/customer..."
            className="flex-1 py-3 ml-2 text-sm"
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              setCurrentPage(1);
            }}
          />
        </View>

        {/* Full Width Main Tabs */}
        <View className="flex-row mb-6 border-b border-gray-100">
          {["transaksi", "withdraw", "refund"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveMainTab(tab);
                setCurrentPage(1);
              }}
              className={`flex-1 items-center pb-3 ${activeMainTab === tab ? "border-b-2 border-[#633594]" : ""}`}
            >
              <Text className={`capitalize font-bold ${activeMainTab === tab ? "text-[#633594]" : "text-gray-400"}`}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sub Filters (Status) */}
        <View className="flex-row gap-2 mb-2">
          {["all", "sukses", "pending", "gagal"].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => {
                setStatusFilter(f);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full border ${statusFilter === f ? "bg-[#633594] border-[#633594]" : "bg-white border-gray-200"}`}
            >
              <Text className={`text-[10px] font-bold uppercase ${statusFilter === f ? "text-white" : "text-gray-400"}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-center my-4">
          <Text className="font-bold text-lg text-gray-800">Riwayat {activeMainTab}</Text>
          <View className="flex-row gap-2">
            {selectedDate !== "" && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDate("");
                  setCurrentPage(1);
                }}
                className="bg-red-50 px-2 py-1.5 rounded-lg justify-center"
              >
                <Text className="text-red-500 text-[10px]">Reset</Text>
              </TouchableOpacity>
            )}

            <RenderDatePicker />
          </View>
        </View>

        {Platform.OS !== "web" && showDatePicker && <DateTimePicker value={selectedDate ? new Date(selectedDate) : new Date()} mode="date" display="default" onChange={onDateChange} />}

        {paginatedData.length === 0 ? (
          <View className="items-center py-20">
            <Clock size={40} color="#ddd" />
            <Text className="text-gray-400 mt-2">Data tidak ditemukan</Text>
          </View>
        ) : (
          paginatedData.map((item: any, index: number) => (
            <View key={index} className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${activeMainTab === "withdraw" ? "bg-orange-50" : activeMainTab === "refund" ? "bg-purple-50" : "bg-blue-50"}`}
                  >
                    {activeMainTab === "withdraw" ? (
                      <ArrowDownCircle size={20} color="#e67e22" />
                    ) : activeMainTab === "refund" ? (
                      <RefreshCcw size={20} color="#9b59b6" />
                    ) : (
                      <TrendingUp size={20} color="#3498db" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800" numberOfLines={1}>
                      {item.mitra_name || item.full_name || item.customer_name}
                    </Text>
                    <Text className="text-gray-400 text-[10px]">{adjustTime(item.order_date || item.created_at || item.tanggal_refund)}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className={`font-bold text-base ${item.status === "completed" || item.status === "SUCCESS" || activeMainTab === "refund" ? "text-green-600" : "text-red-500"}`}>
                    {activeMainTab === "refund" ? "+" : "-"}{" "}
                    {formatRupiah(
                      activeMainTab === "transaksi"
                        ? parseFloat(item.total_price || 0) + parseFloat(item.platform_fee || 0) + parseFloat(item.service_fee || 0)
                        : parseFloat(item.amount || item.nominal_refund || 0),
                    )}
                  </Text>
                  <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">ID: {item.id || item.order_id}</Text>
                </View>
              </View>

              <View className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                {activeMainTab === "transaksi" && (
                  <>
                    {/* Tampilkan seksi ini HANYA jika status adalah cancelled */}
                    {item.status === "cancelled" && (
                      <View className="mb-2 p-2 bg-red-50 rounded-lg border border-red-100">
                        <DetailRow label="Dibatalkan Oleh" value={item.cancelled_by?.toUpperCase() || "SYSTEM"} isBold />
                        <DetailRow label="Alasan" value={item.cancel_reason || "-"} />
                      </View>
                    )}

                    {/* Info reguler tetap muncul */}
                    <DetailRow label="Customer" value={item.customer_name} />
                    <DetailRow label="Jadwal" value={`${item.scheduled_date} ${item.scheduled_time?.substring(0, 5)}`} />
                    <DetailRow label="Metode Pembayaran" value={item.payment_method || "Manual/Transfer"} />
                  </>
                )}
                {activeMainTab === "withdraw" && (
                  <>
                    <DetailRow label="Biaya Admin" value={formatRupiah(adminFee)} />
                    <DetailRow label="Total Potong" value={formatRupiah(parseFloat(item.amount) + parseFloat(adminFee))} isBold />
                  </>
                )}
                {activeMainTab === "refund" && (
                  <>
                    <DetailRow label="Platform Fee" value={formatRupiah(item.platform_fee)} />
                    <DetailRow label="Admin PG" value={formatRupiah(item.service_fee)} />
                    <DetailRow label="Dibatalkan" value={item.cancelled_by} />
                    <DetailRow label="Alasan" value={item.cancel_reason || "-"} />

                    {/* Logika: Jika customer, refund dikurangi service_fee. Jika mitra, tampilkan utuh. */}
                    <DetailRow
                      label="Total Refund"
                      value={formatRupiah(item.cancelled_by === "customer" ? parseFloat(item.nominal_refund) - parseFloat(item.service_fee || 0) : item.nominal_refund)}
                      isBold
                    />
                  </>
                )}
              </View>
            </View>
          ))
        )}

        {totalPages > 1 && (
          <View className="flex-row justify-center items-center mt-4 mb-10 gap-4">
            <TouchableOpacity disabled={currentPage === 1} onPress={() => setCurrentPage((prev) => prev - 1)} className={`p-2 rounded-lg ${currentPage === 1 ? "bg-gray-100" : "bg-purple-100"}`}>
              <ChevronLeft size={20} color={currentPage === 1 ? "gray" : "#633594"} />
            </TouchableOpacity>

            <View className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <Text className="font-bold text-[#633594]">
                Halaman {currentPage} dari {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage((prev) => prev + 1)}
              className={`p-2 rounded-lg ${currentPage === totalPages ? "bg-gray-100" : "bg-purple-100"}`}
            >
              <ChevronRight size={20} color={currentPage === totalPages ? "gray" : "#633594"} />
            </TouchableOpacity>
          </View>
        )}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, isBold }: { label: string; value: string; isBold?: boolean }) {
  return (
    <View className="flex-row justify-between mb-1">
      <Text className="text-[10px] text-gray-500">{label}</Text>
      <Text className={`text-[10px] ${isBold ? "font-bold text-gray-900" : "text-gray-700"}`}>{value}</Text>
    </View>
  );
}

export default withAccess("reports", ReportsScreen);
