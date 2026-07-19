import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle,
    Clock as ClockIcon,
    CreditCard,
    Home,
    Info,
    Loader2,
    MapPinned,
    Phone,
    Star,
    User,
    Wrench,
    X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Toast from "react-native-toast-message";

// ============================================================
// TYPE DEFINITIONS
// ============================================================
interface Pesanan {
    id: number;
    order_id: string;
    cust_id: number;
    cust_nama: string;
    cust_email: string;
    cust_hp: string;
    cust_nik: string;
    alamat: string;
    lat: string;
    lng: string;
    kontak_nama: string;
    kontak_email: string;
    kontak_wa: string;
    kontak_nik: string;
    worker_id: number;
    worker_nama: string;
    worker_umur: string;
    worker_asal: string;
    worker_exp: string;
    worker_gaji_min: string;
    worker_gaji_max: string;
    worker_level: string;
    worker_layanan: string;
    worker_kategori: string;
    worker_foto: string;
    worker_ready: boolean;
    tgl: string;
    jam: string;
    store_id: string;
    metode_bayar: string;
    jenis_gedung: string;
    kategori: string;
    catatan: string;
    kode_voucher: string;
    layanan: string;
    sub_total: number;
    biaya_app: number;
    biaya_trans: number;
    diskon: number;
    total: number;
    pay_id: string;
    pay_method: string;
    pay_status: string;
    pay_at: string;
    expired_at: string;
    voc_diskon: number;
    voc_type: string;
    voc_valid: string;
    status: string;
    matching_status: string;
    created_at: string;
    updated_at: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DetailOrderArtScreen() {
    const { id } = useLocalSearchParams();
    const [order, setOrder] = useState<Pesanan | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);

    // ============================================================
    // ✅ HELPER: CEK APAKAH SUDAH DIBAYAR
    // ============================================================
    const isPaid = (order: Pesanan) => {
        return order.pay_status === 'settlement' ||
            order.pay_status === 'paid' ||
            order.pay_status === 'success' ||
            order.status === 'approved' ||
            order.status === 'paid' ||
            order.status === 'done' ||
            order.status === 'completed';
    };

    // ============================================================
    // FETCH ORDER DATA
    // ============================================================
    useEffect(() => {
        if (id) {
            fetchOrderDetail();
        }
    }, [id]);

    const fetchOrderDetail = async () => {
        setLoading(true);
        try {
            // ✅ PERBAIKAN: Gunakan endpoint /api/pesanan (tanpa /art)
            const response = await axios.get(
                `https://backend.tangerangfast.online/api/pesanan/${id}`
            );
            if (response.data.success) {
                setOrder(response.data.data);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal',
                    text2: response.data.message || 'Data pesanan tidak ditemukan',
                });
            }
        } catch (error: any) {
            console.error('Error fetch order:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Gagal mengambil data pesanan',
            });
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // UPDATE STATUS FUNCTIONS
    // ============================================================
    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            // ✅ PERBAIKAN: Gunakan endpoint /api/pesanan (tanpa /art)
            const response = await axios.put(
                `https://backend.tangerangfast.online/api/pesanan/${id}/status`,
                { status: newStatus }
            );

            if (response.data.success) {
                setOrder(response.data.data);
                Toast.show({
                    type: 'success',
                    text1: 'Berhasil',
                    text2: `Status berhasil diupdate menjadi ${getStatusLabel(newStatus)}`,
                });
                setShowStatusModal(false);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal',
                    text2: response.data.message || 'Gagal mengupdate status',
                });
            }
        } catch (error: any) {
            console.error('Error update status:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Gagal mengupdate status',
            });
        } finally {
            setUpdating(false);
        }
    };

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================
    const getStatusLabel = (status: string): string => {
        const statusMap: { [key: string]: string } = {
            'pending': 'Menunggu Pembayaran',
            'paid': 'Dibayar',
            'matching': 'Mencari Pekerja',
            'approved': 'Disetujui',
            'calling': 'Menghubungi',
            'working': 'Sedang Bekerja',
            'done': 'Selesai',
            'completed': 'Selesai',
            'rejected': 'Ditolak',
            'cancelled': 'Dibatalkan'
        };
        return statusMap[status] || status;
    };

    const getStatusColor = (status: string): string => {
        const colorMap: { [key: string]: string } = {
            'pending': '#F59E0B',
            'paid': '#3B82F6',
            'matching': '#8B5CF6',
            'approved': '#10B981',
            'calling': '#F59E0B',
            'working': '#3B82F6',
            'done': '#10B981',
            'completed': '#10B981',
            'rejected': '#EF4444',
            'cancelled': '#EF4444'
        };
        return colorMap[status] || '#6B7280';
    };

    const getStatusBg = (status: string): string => {
        const bgMap: { [key: string]: string } = {
            'pending': 'bg-yellow-50',
            'paid': 'bg-blue-50',
            'matching': 'bg-purple-50',
            'approved': 'bg-green-50',
            'calling': 'bg-yellow-50',
            'working': 'bg-blue-50',
            'done': 'bg-green-50',
            'completed': 'bg-green-50',
            'rejected': 'bg-red-50',
            'cancelled': 'bg-red-50'
        };
        return bgMap[status] || 'bg-gray-50';
    };

    const getStatusTextColor = (status: string): string => {
        const colorMap: { [key: string]: string } = {
            'pending': 'text-yellow-600',
            'paid': 'text-blue-600',
            'matching': 'text-purple-600',
            'approved': 'text-green-600',
            'calling': 'text-yellow-600',
            'working': 'text-blue-600',
            'done': 'text-green-600',
            'completed': 'text-green-600',
            'rejected': 'text-red-600',
            'cancelled': 'text-red-600'
        };
        return colorMap[status] || 'text-gray-600';
    };

    const getMatchingStatusLabel = (status: string): string => {
        const map: { [key: string]: string } = {
            'pending': 'Menunggu',
            'matching': 'Sedang Mencari',
            'approved': 'Disetujui',
            'rejected': 'Ditolak'
        };
        return map[status] || status;
    };

    const getMatchingStatusColor = (status: string): string => {
        const map: { [key: string]: string } = {
            'pending': '#F59E0B',
            'matching': '#8B5CF6',
            'approved': '#10B981',
            'rejected': '#EF4444'
        };
        return map[status] || '#6B7280';
    };

    const formatRupiah = (angka: number) => {
        return 'Rp' + angka.toLocaleString('id-ID');
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string): string => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ============================================================
    // AVAILABLE STATUS OPTIONS
    // ============================================================
    const statusOptions = [
        { value: 'pending', label: 'Menunggu Pembayaran', icon: ClockIcon },
        { value: 'paid', label: 'Dibayar', icon: CreditCard },
        { value: 'matching', label: 'Mencari Pekerja', icon: Loader2 },
        { value: 'approved', label: 'Disetujui', icon: CheckCircle },
        { value: 'calling', label: 'Menghubungi', icon: Phone },
        { value: 'working', label: 'Sedang Bekerja', icon: Wrench },
        { value: 'done', label: 'Selesai', icon: Check },
        { value: 'completed', label: 'Selesai', icon: Check },
        { value: 'rejected', label: 'Ditolak', icon: X },
        { value: 'cancelled', label: 'Dibatalkan', icon: X },
    ];

    const getAvailableStatuses = () => {
        const currentStatus = order?.status || 'pending';
        const statusFlow: { [key: string]: string[] } = {
            'pending': ['paid', 'cancelled'],
            'paid': ['matching', 'cancelled'],
            'matching': ['approved', 'rejected', 'cancelled'],
            'approved': ['calling', 'cancelled'],
            'calling': ['working', 'cancelled'],
            'working': ['done', 'cancelled'],
            'done': [],
            'completed': [],
            'rejected': [],
            'cancelled': []
        };

        const available = statusFlow[currentStatus] || [];
        return statusOptions.filter(opt => available.includes(opt.value));
    };

    // ============================================================
    // RENDER LOADING
    // ============================================================
    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
                <ActivityIndicator size="large" color="#633594" />
            </View>
        );
    }

    // ============================================================
    // RENDER NOT FOUND
    // ============================================================
    if (!order) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA] p-4">
                <AlertCircle size={48} color="#EF4444" />
                <Text className="text-gray-500 mt-4 text-center">Pesanan tidak ditemukan.</Text>
                <Pressable
                    onPress={() => router.back()}
                    className="mt-4 bg-[#633594] px-6 py-3 rounded-lg"
                >
                    <Text className="text-white font-bold">Kembali</Text>
                </Pressable>
            </View>
        );
    }

    // ============================================================
    // MAIN RENDER
    // ============================================================
    const availableStatuses = getAvailableStatuses();

    return (
        <View className="flex-1 bg-[#F5F7FA]">
            {/* HEADER */}
            <View className="bg-white px-4 pb-4 pt-12 flex-row items-center border-b border-gray-100">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color="#633594" />
                </Pressable>
                <Text className="text-xl font-bold text-gray-800 ml-2 flex-1">
                    Detail Pesanan
                </Text>
                <Text className="text-sm font-bold text-[#633594] bg-purple-50 px-3 py-1 rounded-full">
                    #{order.order_id || order.id}
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 space-y-4">

                    {/* STATUS CARD */}
                    <View className="bg-white p-5 rounded-[20px] border border-gray-100">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                Status Pesanan
                            </Text>
                            <View className={`px-4 py-1.5 rounded-full ${getStatusBg(order.status)}`}>
                                <Text className={`font-bold text-[10px] ${getStatusTextColor(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                </Text>
                            </View>
                        </View>

                        {/* ✅ PERBAIKAN: Status Pembayaran */}
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                Status Pembayaran
                            </Text>
                            <View className="px-3 py-1 rounded-full" style={{
                                backgroundColor: isPaid(order) ? '#10B98120' : '#F59E0B20'
                            }}>
                                <Text className="font-bold text-[10px]" style={{
                                    color: isPaid(order) ? '#10B981' : '#F59E0B'
                                }}>
                                    {isPaid(order) ? '✅ Lunas' : '⏳ Belum Bayar'}
                                </Text>
                            </View>
                        </View>

                        {/* Matching Status */}
                        {order.matching_status && order.matching_status !== 'pending' && (
                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                    Status Pencarian
                                </Text>
                                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: `${getMatchingStatusColor(order.matching_status)}20` }}>
                                    <Text className="font-bold text-[10px]" style={{ color: getMatchingStatusColor(order.matching_status) }}>
                                        {getMatchingStatusLabel(order.matching_status)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Info Tanggal */}
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center">
                                <Calendar size={14} color="#633594" />
                            </View>
                            <View className="ml-3">
                                <Text className="text-gray-400 text-[10px]">Tanggal Pemesanan</Text>
                                <Text className="text-gray-700 font-bold text-xs">
                                    {formatDateTime(order.created_at)}
                                </Text>
                            </View>
                        </View>

                        {/* Info Jadwal */}
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center">
                                <CalendarDays size={14} color="#633594" />
                            </View>
                            <View className="ml-3">
                                <Text className="text-gray-400 text-[10px]">Jadwal Layanan</Text>
                                <Text className="text-gray-700 font-bold text-xs">
                                    {formatDate(order.tgl)} • {order.jam?.substring(0, 5) || '-'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* CUSTOMER INFO */}
                    <View className="bg-white p-5 rounded-[20px] border border-gray-100">
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
                            Informasi Pelanggan
                        </Text>
                        <View className="space-y-3">
                            <View className="flex-row items-center">
                                <User size={18} color="#633594" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">Nama</Text>
                                    <Text className="font-bold text-gray-800">{order.cust_nama || order.kontak_nama}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <Phone size={18} color="#633594" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">WhatsApp</Text>
                                    <Text className="font-bold text-gray-800">{order.cust_hp || order.kontak_wa}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <Home size={18} color="#633594" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">Alamat</Text>
                                    <Text className="font-bold text-gray-800 text-sm">{order.alamat}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <Building2 size={18} color="#633594" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">Jenis Gedung</Text>
                                    <Text className="font-bold text-gray-800">{order.jenis_gedung}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* WORKER INFO */}
                    <View className="bg-white p-5 rounded-[20px] border border-gray-100">
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
                            Informasi Pekerja
                        </Text>
                        <View className="flex-row items-start">
                            <Image
                                source={{
                                    uri: order.worker_foto || `https://ui-avatars.com/api/?name=${order.worker_nama}&background=633594&color=fff&size=100&bold=true`
                                }}
                                className="w-16 h-16 rounded-full bg-gray-200"
                                onError={(e) => {
                                    // Fallback jika gambar gagal dimuat
                                }}
                            />
                            <View className="ml-4 flex-1">
                                <Text className="font-bold text-gray-800 text-base">{order.worker_nama || '-'}</Text>
                                <Text className="text-xs text-gray-500">Usia: {order.worker_umur || '-'} Tahun</Text>
                                <Text className="text-xs text-gray-500">Asal: {order.worker_asal || '-'}</Text>
                                <Text className="text-xs text-gray-500">Pengalaman: {order.worker_exp || '-'}</Text>
                                <Text className="text-xs text-gray-500">Level: {order.worker_level || '-'}</Text>
                                <Text className="text-xs text-gray-500">Kategori: {order.worker_kategori || '-'}</Text>
                                <Text className="text-xs font-semibold text-[#633594]">
                                    Gaji: {formatRupiah(parseInt(order.worker_gaji_min) || 0)}
                                </Text>
                            </View>
                        </View>
                        {order.worker_ready && (
                            <View className="mt-3 bg-green-50 px-3 py-1.5 rounded-full self-start">
                                <Text className="text-xs font-bold text-green-600">✓ Siap Bekerja</Text>
                            </View>
                        )}
                    </View>

                    {/* ORDER DETAILS */}
                    <View className="bg-white p-5 rounded-[20px] border border-gray-100">
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
                            Detail Pesanan
                        </Text>
                        <View className="space-y-3">
                            <View className="flex-row items-start">
                                <Wrench size={18} color="#633594" className="mt-0.5" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">Layanan</Text>
                                    <Text className="font-bold text-gray-800">{order.layanan || '-'}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-start">
                                <MapPinned size={18} color="#633594" className="mt-0.5" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">Kategori</Text>
                                    <Text className="font-bold text-gray-800">{order.kategori || '-'}</Text>
                                </View>
                            </View>
                            <View className="flex-row items-start">
                                <CreditCard size={18} color="#633594" className="mt-0.5" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-[10px] text-gray-400">Metode Pembayaran</Text>
                                    <Text className="font-bold text-gray-800">{order.metode_bayar || '-'}</Text>
                                </View>
                            </View>
                            {order.kode_voucher && (
                                <View className="flex-row items-start">
                                    <Star size={18} color="#633594" className="mt-0.5" />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-[10px] text-gray-400">Voucher</Text>
                                        <Text className="font-bold text-gray-800">{order.kode_voucher}</Text>
                                        {order.voc_diskon > 0 && (
                                            <Text className="text-xs text-green-600">Diskon: {formatRupiah(order.voc_diskon)}</Text>
                                        )}
                                    </View>
                                </View>
                            )}
                            {order.catatan && (
                                <View className="mt-2 p-3 bg-gray-50 rounded-xl flex-row items-start">
                                    <Info size={16} color="#633594" className="mt-0.5" />
                                    <Text className="ml-2 text-xs text-gray-600 flex-1">{order.catatan}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* COST BREAKDOWN */}
                    <View className="bg-white p-5 rounded-[20px] border border-gray-100">
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
                            Rincian Biaya
                        </Text>
                        <View className="space-y-3">
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Sub Total</Text>
                                <Text className="font-medium text-gray-800">{formatRupiah(order.sub_total)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Biaya Aplikasi</Text>
                                <Text className="font-medium text-gray-800">{formatRupiah(order.biaya_app)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Biaya Transaksi</Text>
                                <Text className="font-medium text-gray-800">{formatRupiah(order.biaya_trans)}</Text>
                            </View>
                            {order.diskon > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-red-500">Diskon</Text>
                                    <Text className="text-red-500 font-medium">-{formatRupiah(order.diskon)}</Text>
                                </View>
                            )}
                            <View className="mt-3 pt-3 border-t border-dashed border-gray-200 flex-row justify-between items-center">
                                <Text className="font-bold text-gray-800 text-base">Total</Text>
                                <Text className="font-bold text-xl text-[#633594]">
                                    {formatRupiah(order.total)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* BOTTOM ACTION BUTTON */}
            {availableStatuses.length > 0 && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                    <Pressable
                        onPress={() => setShowStatusModal(true)}
                        className="bg-[#633594] py-4 rounded-xl flex-row items-center justify-center"
                    >
                        <Wrench size={20} color="#fff" className="mr-2" />
                        <Text className="text-white font-bold text-base">
                            Ubah Status
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* STATUS CHANGE MODAL */}
            <Modal
                visible={showStatusModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-800">Ubah Status</Text>
                            <Pressable onPress={() => setShowStatusModal(false)}>
                                <X size={24} color="#6B7280" />
                            </Pressable>
                        </View>

                        <Text className="text-sm text-gray-500 mb-4">
                            Status saat ini: <Text className="font-bold text-[#633594]">{getStatusLabel(order.status)}</Text>
                        </Text>

                        <ScrollView className="max-h-96">
                            {availableStatuses.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        onPress={() => updateStatus(opt.value)}
                                        disabled={updating}
                                        className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
                                    >
                                        <Icon size={20} color="#633594" />
                                        <Text className="ml-3 text-base font-medium text-gray-700 flex-1">
                                            {opt.label}
                                        </Text>
                                        {updating && (
                                            <ActivityIndicator size="small" color="#633594" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <Pressable
                            onPress={() => setShowStatusModal(false)}
                            className="mt-4 py-3 rounded-xl border border-gray-300"
                        >
                            <Text className="text-gray-600 font-medium text-center">Batal</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Toast />
        </View>
    );
}