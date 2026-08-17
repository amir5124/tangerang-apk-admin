import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Eye,
    LogOut,
    MapPin,
    Phone,
    RefreshCw,
    Search,
    User,
    Users,
    Video,
    X,
    XCircle
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Toast from "react-native-toast-message";
import { ArtOrder, orderService } from "../../src/services/orderService";

// ============================================================
// ✅ SLOT JADWAL CONFERENCE CALL (batas akhir 17.00)
// ============================================================
const CALL_SLOTS = [
    "09.00–10.00",
    "10.00–11.00",
    "11.00–12.00",
    "12.00–13.00",
    "13.00–14.00",
    "14.00–15.00",
    "15.00–16.00",
    "16.00–17.00",
];

export default function ArtOrderScreen() {
    const params = useLocalSearchParams() as any;
    const notificationId = params.id || params.orderId;
    const fromNotification = params.fromNotification === 'true';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<ArtOrder[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<ArtOrder[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const [selectedOrder, setSelectedOrder] = useState<ArtOrder | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Modal jadwal Conference Call
    const [showCallScheduleModal, setShowCallScheduleModal] = useState(false);
    const [gomeetLink, setGomeetLink] = useState('');
    const [callDate, setCallDate] = useState('');
    const [callSlot, setCallSlot] = useState('');
    const [callErrors, setCallErrors] = useState<{link?: string, date?: string, slot?: string}>({});

    // Modal alur keberangkatan
    const [showDepartureModal, setShowDepartureModal] = useState(false);
    const [departureMethod, setDepartureMethod] = useState<'driver_online' | 'dijemput_user' | ''>('');
    const [departureDate, setDepartureDate] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        paid: 0,
        matching: 0,
        approved: 0,
        calling: 0,
        working: 0,
        berangkat: 0,
        rejected: 0,
        rejected_searching: 0,
        done: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0
    });

    const hasOpenedFromNotification = useRef(false);

    // ============================================================
    // ✅ HELPER FUNCTIONS
    // ============================================================
    
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isPaid = (order: ArtOrder) => {
        return order.pay_status === 'settlement' ||
            order.pay_status === 'paid' ||
            order.pay_status === 'success' ||
            order.status === 'approved' ||
            order.status === 'paid' ||
            order.status === 'done' ||
            order.status === 'completed';
    };

    const getPayStatusLabel = (order: ArtOrder) => {
        if (isPaid(order)) return '✅ Lunas';
        return '⏳ Belum Bayar';
    };

    const getPayStatusColor = (order: ArtOrder) => {
        if (isPaid(order)) return 'text-green-600';
        return 'text-yellow-600';
    };

    // ============================================================
    // ✅ LOGOUT
    // ============================================================
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

    // ============================================================
    // ✅ FETCH DATA
    // ============================================================
    const fetchOrders = async () => {
        try {
            const response = await orderService.getAllOrdersArt();
            if (response.success) {
                const data: ArtOrder[] = response.data || [];
                setOrders(data);
                applyFilters(data, searchQuery, filterStatus);
                calculateStats(data);

                if (notificationId && fromNotification && !hasOpenedFromNotification.current) {
                    const order = data.find((o: ArtOrder) =>
                        String(o.id) === String(notificationId) ||
                        String(o.order_id) === String(notificationId)
                    );
                    if (order) {
                        console.log("🔔 Opening order from notification:", order);
                        hasOpenedFromNotification.current = true;
                        setSelectedOrder(order);
                        setShowDetailModal(true);

                        Toast.show({
                            type: 'success',
                            text1: '📨 Notifikasi',
                            text2: `Menampilkan pesanan #${order.order_id}`,
                            visibilityTime: 2000,
                        });
                    } else {
                        console.log("⚠️ Order not found for notification:", notificationId);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetch ART orders:', error);
            Toast.show({
                type: 'error',
                text1: 'Gagal',
                text2: 'Gagal mengambil data pesanan',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const applyFilters = (data: ArtOrder[], query: string, status: string) => {
        let filtered = data;

        if (status !== 'all') {
            filtered = filtered.filter((o: ArtOrder) => o.status === status);
        }

        if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter((o: ArtOrder) =>
                o.order_id?.toLowerCase().includes(q) ||
                o.cust_nama?.toLowerCase().includes(q) ||
                o.worker_nama?.toLowerCase().includes(q) ||
                o.cust_email?.toLowerCase().includes(q) ||
                o.cust_hp?.includes(q)
            );
        }

        setFilteredOrders(filtered);
    };

    const calculateStats = (data: ArtOrder[]) => {
        const paidOrders = data.filter((o: ArtOrder) => isPaid(o));
        const totalRevenue = paidOrders.reduce((sum: number, o: ArtOrder) => sum + o.total, 0);

        setStats({
            total: data.length,
            pending: data.filter((o: ArtOrder) => o.status === 'pending').length,
            paid: data.filter((o: ArtOrder) => o.status === 'paid').length,
            matching: data.filter((o: ArtOrder) => o.status === 'matching').length,
            approved: data.filter((o: ArtOrder) => o.status === 'approved').length,
            calling: data.filter((o: ArtOrder) => o.status === 'calling').length,
            working: data.filter((o: ArtOrder) => o.status === 'working').length,
            berangkat: data.filter((o: ArtOrder) =>
                o.status === 'berangkat_dari_cicana' ||
                o.status === 'berangkat_cek_kesehatan' ||
                o.status === 'berangkat_siap_diantar'
            ).length,
            rejected: data.filter((o: ArtOrder) => o.status === 'rejected').length,
            rejected_searching: data.filter((o: ArtOrder) => o.status === 'rejected_searching').length,
            done: data.filter((o: ArtOrder) => o.status === 'done' || o.status === 'completed').length,
            completed: data.filter((o: ArtOrder) => o.status === 'completed').length,
            cancelled: data.filter((o: ArtOrder) => o.status === 'cancelled').length,
            totalRevenue: totalRevenue
        });
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        applyFilters(orders, query, filterStatus);
    };

    const handleFilterChange = (status: string) => {
        setFilterStatus(status);
        applyFilters(orders, searchQuery, status);
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
            return () => {
                hasOpenedFromNotification.current = false;
            };
        }, [])
    );

    // ============================================================
    // ✅ DETAIL ORDER FUNCTIONS
    // ============================================================
    const openDetail = (order: ArtOrder) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const closeDetail = () => {
        setShowDetailModal(false);
        setSelectedOrder(null);
        setShowStatusModal(false);
    };

    // ============================================================
    // ✅ STATUS FLOW
    // ============================================================
    const getNextStatuses = (currentStatus: string): string[] => {
        const flowMap: Record<string, string[]> = {
            'pending': ['paid', 'cancelled'],
            'paid': ['matching', 'cancelled'],
            'matching': ['approved', 'rejected_searching', 'cancelled'],
            'approved': ['calling', 'cancelled'],
            'calling': ['working', 'rejected', 'rejected_searching', 'cancelled'],
            'working': ['berangkat_dari_cicana', 'rejected', 'rejected_searching', 'cancelled'],
            'berangkat_dari_cicana': ['berangkat_cek_kesehatan', 'cancelled'],
            'berangkat_cek_kesehatan': ['berangkat_siap_diantar', 'cancelled'],
            'berangkat_siap_diantar': ['completed', 'cancelled'],
            'rejected_searching': ['matching', 'cancelled'],
            'rejected': [],
            'completed': [],
            'cancelled': []
        };
        return flowMap[currentStatus] || [];
    };

    // ============================================================
    // ✅ UPDATE STATUS
    // ============================================================
    const updateStatus = async (newStatus: string, extraPayload?: Record<string, any>) => {
        if (!selectedOrder) return;

        const validStatuses = [
            'pending', 'paid', 'matching', 'approved', 'calling', 'working',
            'berangkat_dari_cicana', 'berangkat_cek_kesehatan', 'berangkat_siap_diantar',
            'rejected', 'rejected_searching', 'completed', 'cancelled'
        ];
        if (!validStatuses.includes(newStatus)) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: `Status "${newStatus}" tidak valid`,
            });
            return;
        }

        const nextStatuses = getNextStatuses(selectedOrder.status);
        if (!nextStatuses.includes(newStatus)) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: `Tidak bisa mengubah dari "${getStatusLabel(selectedOrder.status)}" ke "${getStatusLabel(newStatus)}"`,
            });
            return;
        }

        setUpdating(true);
        try {
            console.log('Updating order:', {
                id: selectedOrder.id,
                currentStatus: selectedOrder.status,
                newStatus: newStatus,
                extraPayload,
            });

            const response = await (orderService.updateStatusArt as any)(
                selectedOrder.id.toString(),
                newStatus,
                extraPayload
            );

            if (response.success) {
                const updatedOrders = orders.map(o =>
                    o.id === selectedOrder.id ? response.data : o
                );
                setOrders(updatedOrders);
                applyFilters(updatedOrders, searchQuery, filterStatus);
                calculateStats(updatedOrders);
                setSelectedOrder(response.data);

                Toast.show({
                    type: 'success',
                    text1: 'Berhasil',
                    text2: `Status berubah jadi ${getStatusLabel(newStatus)}`,
                });
                setShowStatusModal(false);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Gagal',
                    text2: response.message || 'Gagal update status',
                });
            }
        } catch (error: any) {
            console.error('Error update status detail:', error);

            let errorMessage = 'Gagal update status';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
            });
        } finally {
            setUpdating(false);
        }
    };

    // ============================================================
    // ✅ HANDLE SELECT STATUS
    // ============================================================
    const handleSelectStatus = (statusValue: string) => {
        if (statusValue === 'calling') {
            setGomeetLink('');
            setCallDate('');
            setCallSlot('');
            setCallErrors({});
            setShowCallScheduleModal(true);
            return;
        }
        if (statusValue === 'berangkat_siap_diantar') {
            setDepartureMethod('');
            setDepartureDate('');
            setShowDepartureModal(true);
            return;
        }
        updateStatus(statusValue);
    };

    // ============================================================
    // ✅ SUBMIT CALL SCHEDULE (FIXED)
    // ============================================================
    const submitCallSchedule = async () => {
        const errors: {link?: string, date?: string, slot?: string} = {};
        
        // Validasi Link
        if (!gomeetLink.trim()) {
            errors.link = 'Link Gomeet wajib diisi';
        } else if (!gomeetLink.trim().includes('meet.google.com')) {
            errors.link = 'Masukkan link Google Meet yang valid';
        }
        
        // Validasi Tanggal
        if (!callDate) {
            errors.date = 'Tanggal call wajib diisi';
        } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(callDate)) {
                errors.date = 'Format tanggal harus YYYY-MM-DD';
            } else {
                const selectedDate = new Date(callDate + 'T00:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate < today) {
                    errors.date = 'Tanggal tidak boleh kurang dari hari ini';
                }
            }
        }
        
        // Validasi Slot
        if (!callSlot) {
            errors.slot = 'Pilih jadwal jam conference call';
        }
        
        setCallErrors(errors);
        
        if (Object.keys(errors).length > 0) {
            Toast.show({
                type: 'error',
                text1: 'Validasi Gagal',
                text2: 'Lengkapi semua field yang diperlukan',
            });
            return;
        }
        
        await updateStatus('calling', {
            gomeet_link: gomeetLink.trim(),
            call_date: callDate.trim(),
            call_slot: callSlot,
        });
        setShowCallScheduleModal(false);
        setCallErrors({});
        setGomeetLink('');
        setCallDate('');
        setCallSlot('');
    };

    // ============================================================
    // ✅ SUBMIT DEPARTURE
    // ============================================================
    const submitDeparture = async () => {
        if (!departureMethod) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Pilih metode keberangkatan' });
            return;
        }
        if (!departureDate.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Isi tanggal keberangkatan' });
            return;
        }
        await updateStatus('berangkat_siap_diantar', {
            departure_method: departureMethod,
            departure_date: departureDate.trim(),
        });
        setShowDepartureModal(false);
    };

    // ============================================================
    // ✅ HELPER FUNCTIONS - UI
    // ============================================================
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'pending': '#F59E0B',
            'paid': '#3B82F6',
            'matching': '#8B5CF6',
            'approved': '#10B981',
            'calling': '#EC4899',
            'working': '#F97316',
            'berangkat_dari_cicana': '#0EA5E9',
            'berangkat_cek_kesehatan': '#14B8A6',
            'berangkat_siap_diantar': '#22C55E',
            'rejected': '#EF4444',
            'rejected_searching': '#FB923C',
            'done': '#10B981',
            'completed': '#10B981',
            'cancelled': '#EF4444'
        };
        return colors[status] || '#6B7280';
    };

    const getStatusBg = (status: string) => {
        const bgMap: Record<string, string> = {
            'pending': 'bg-yellow-50',
            'paid': 'bg-blue-50',
            'matching': 'bg-purple-50',
            'approved': 'bg-green-50',
            'calling': 'bg-pink-50',
            'working': 'bg-orange-50',
            'berangkat_dari_cicana': 'bg-sky-50',
            'berangkat_cek_kesehatan': 'bg-teal-50',
            'berangkat_siap_diantar': 'bg-emerald-50',
            'rejected': 'bg-red-50',
            'rejected_searching': 'bg-orange-50',
            'done': 'bg-green-50',
            'completed': 'bg-green-50',
            'cancelled': 'bg-red-50'
        };
        return bgMap[status] || 'bg-gray-50';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'pending': 'Menunggu',
            'paid': 'Dibayar',
            'matching': 'Pencocokan',
            'approved': 'Disetujui',
            'calling': 'Conference Call',
            'working': 'Bekerja',
            'berangkat_dari_cicana': 'Berangkat dari Cicana',
            'berangkat_cek_kesehatan': 'Cek Kesehatan',
            'berangkat_siap_diantar': 'Siap Diantar',
            'rejected': 'Ditolak',
            'rejected_searching': 'Ditolak - Masih Mencari',
            'done': 'Selesai',
            'completed': 'Selesai',
            'cancelled': 'Dibatalkan'
        };
        return labels[status] || status;
    };

    const formatRupiah = (angka: number) => {
        return 'Rp ' + angka.toLocaleString('id-ID');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ============================================================
    // ✅ TABS & STATUS FLOW
    // ============================================================
    const filterTabs = [
        { value: 'all', label: 'Semua', count: stats.total, color: '#633594' },
        { value: 'pending', label: 'Menunggu', count: stats.pending, color: '#F59E0B' },
        { value: 'paid', label: 'Dibayar', count: stats.paid, color: '#3B82F6' },
        { value: 'matching', label: 'Pencocokan', count: stats.matching, color: '#8B5CF6' },
        { value: 'approved', label: 'Disetujui', count: stats.approved, color: '#10B981' },
        { value: 'calling', label: 'Conference', count: stats.calling, color: '#EC4899' },
        { value: 'working', label: 'Bekerja', count: stats.working, color: '#F97316' },
        { value: 'berangkat_siap_diantar', label: 'Berangkat', count: stats.berangkat, color: '#22C55E' },
        { value: 'rejected_searching', label: 'Ditolak-Cari', count: stats.rejected_searching, color: '#FB923C' },
        { value: 'completed', label: 'Selesai', count: stats.completed, color: '#10B981' },
        { value: 'cancelled', label: 'Batal', count: stats.cancelled, color: '#EF4444' },
    ];

    const statusFlow = [
        { value: 'pending', label: 'Menunggu' },
        { value: 'paid', label: 'Dibayar' },
        { value: 'matching', label: 'Pencocokan' },
        { value: 'approved', label: 'Disetujui' },
        { value: 'calling', label: 'Conference Call (Isi Link & Jadwal)' },
        { value: 'working', label: 'Bekerja' },
        { value: 'berangkat_dari_cicana', label: 'Berangkat dari Cicana' },
        { value: 'berangkat_cek_kesehatan', label: 'Cek Kesehatan' },
        { value: 'berangkat_siap_diantar', label: 'Siap Diantar (Isi Metode & Tanggal)' },
        { value: 'rejected_searching', label: 'Ditolak - Masih Mencari' },
        { value: 'rejected', label: 'Ditolak' },
        { value: 'completed', label: 'Selesai' },
        { value: 'cancelled', label: 'Dibatalkan' }
    ];

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
                <ActivityIndicator size="large" color="#633594" />
                <Text className="text-gray-400 mt-4 text-sm">Memuat pesanan...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F5F7FA]">
            {/* Header */}
            <View className="bg-[#633594] pt-12 pb-4 px-[10px] rounded-b-3xl">
                <View className="flex-row items-center justify-between mb-4">
                    <View>
                        <Text className="text-white text-xl font-black">ART Order</Text>
                        <Text className="text-white/70 text-xs mt-0.5">Kelola pesanan babysitter / ART</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            onPress={onRefresh}
                            className="bg-white/15 rounded-full w-9 h-9 items-center justify-center"
                        >
                            <RefreshCw size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleLogout}
                            className="bg-white/15 rounded-full w-9 h-9 items-center justify-center"
                        >
                            <LogOut size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View className="flex-row items-center bg-white rounded-2xl px-3 h-11 mb-3">
                    <Search size={17} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 py-1.5 px-2 text-gray-700 text-sm"
                        placeholder="Cari nama, HP, atau kode order..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery ? (
                        <Pressable onPress={() => handleSearch('')}>
                            <XCircle size={17} color="#9CA3AF" />
                        </Pressable>
                    ) : null}
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row space-x-2">
                        {filterTabs.map((tab) => {
                            const active = filterStatus === tab.value;
                            return (
                                <TouchableOpacity
                                    key={tab.value}
                                    onPress={() => handleFilterChange(tab.value)}
                                    activeOpacity={0.8}
                                    className={`px-3.5 py-2 rounded-2xl flex-row items-center ${active ? 'bg-white' : 'bg-white/10'}`}
                                >
                                    <View
                                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                                        style={{ backgroundColor: active ? tab.color : 'rgba(255,255,255,0.6)' }}
                                    />
                                    <Text
                                        className={`text-xs font-bold ${active ? '' : 'text-white/90'}`}
                                        style={active ? { color: tab.color } : undefined}
                                    >
                                        {tab.label}
                                    </Text>
                                    <View
                                        className={`ml-1.5 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${active ? 'bg-gray-100' : 'bg-white/20'}`}
                                    >
                                        <Text
                                            className={`text-[10px] font-bold ${active ? 'text-gray-600' : 'text-white'}`}
                                        >
                                            {tab.count}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            {/* Order List */}
            <FlatList
                className="flex-1 px-[10px] pt-3"
                data={filteredOrders}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={() => (
                    <View className="bg-white rounded-2xl p-8 items-center mt-4 border border-gray-100">
                        <AlertCircle size={40} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-2 text-center text-sm">
                            {filterStatus !== 'all' ? `Tidak ada pesanan ${getStatusLabel(filterStatus)}` : 'Belum ada pesanan'}
                        </Text>
                    </View>
                )}
                renderItem={({ item: order }) => {
                    const statusColor = getStatusColor(order.status);
                    return (
                        <Pressable
                            onPress={() => openDetail(order)}
                            className="bg-white rounded-2xl mb-3 border border-gray-100 overflow-hidden active:opacity-80"
                            style={{
                                shadowColor: '#000',
                                shadowOpacity: 0.04,
                                shadowRadius: 6,
                                shadowOffset: { width: 0, height: 2 },
                                elevation: 1,
                            }}
                        >
                            <View className="flex-row">
                                <View className="w-1.5" style={{ backgroundColor: statusColor }} />
                                <View className="flex-1 p-3.5">
                                    <View className="flex-row justify-between items-center mb-2">
                                        <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                                            <Text className="text-gray-500 text-[10px] font-bold">
                                                #{order.order_id?.slice(-8) || order.id}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            {isPaid(order) && (
                                                <CheckCircle size={13} color="#10B981" style={{ marginRight: 4 }} />
                                            )}
                                            <View className={`px-2.5 py-1 rounded-full ${getStatusBg(order.status)}`}>
                                                <Text className="text-[9px] font-black" style={{ color: statusColor }}>
                                                    {getStatusLabel(order.status)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center">
                                        <View className="w-9 h-9 rounded-full bg-purple-50 items-center justify-center mr-2.5">
                                            <User size={16} color="#633594" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-bold text-gray-800" numberOfLines={1}>
                                                {order.cust_nama || order.kontak_nama}
                                            </Text>
                                            {order.worker_nama ? (
                                                <Text className="text-[11px] text-gray-400" numberOfLines={1}>
                                                    Pekerja: {order.worker_nama}
                                                </Text>
                                            ) : (
                                                <Text className="text-[11px] text-gray-300">Belum ada pekerja</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View className="flex-row items-center mt-2.5">
                                        <Calendar size={11} color="#9CA3AF" />
                                        <Text className="text-[11px] text-gray-400 ml-1">
                                            {formatDate(order.tgl)}
                                        </Text>
                                        <Clock size={11} color="#9CA3AF" style={{ marginLeft: 8 }} />
                                        <Text className="text-[11px] text-gray-400 ml-1">
                                            {order.jam?.substring(0, 5) || '-'}
                                        </Text>
                                    </View>

                                    <View className="flex-row justify-between items-center pt-2.5 mt-2.5 border-t border-gray-50">
                                        <View>
                                            <Text className="text-[9px] text-gray-400 font-semibold uppercase">Total</Text>
                                            <Text className="text-sm font-black text-[#633594]">
                                                {formatRupiah(order.total)}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center bg-purple-50 px-3 py-1.5 rounded-xl">
                                            <Eye size={13} color="#633594" />
                                            <Text className="text-[11px] font-bold text-[#633594] ml-1">Detail</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    );
                }}
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            {/* ============================================================
                DETAIL ORDER MODAL
                ============================================================ */}
            <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={closeDetail}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl max-h-[85%]" style={{ paddingBottom: 50 }}>
                        <View className="flex-row justify-between items-center p-3 border-b border-gray-100">
                            <View>
                                <Text className="text-base font-bold text-gray-800">Detail Pesanan</Text>
                                {fromNotification && notificationId && (
                                    <View className="flex-row items-center mt-1">
                                        <View className="bg-red-500 px-2 py-0.5 rounded-full">
                                            <Text className="text-white text-[8px] font-bold">📨 NOTIFIKASI</Text>
                                        </View>
                                    </View>
                                )}
                                <Text className="text-[10px] text-gray-400">#{selectedOrder?.order_id || selectedOrder?.id}</Text>
                            </View>
                            <TouchableOpacity onPress={closeDetail} className="p-1.5 bg-gray-100 rounded-full">
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="p-3" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
                            {selectedOrder && (
                                <>
                                    <View className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-gray-400 text-[10px] font-bold uppercase">Status Pesanan</Text>
                                            <View className={`px-3 py-1 rounded-full ${getStatusBg(selectedOrder.status)}`}>
                                                <Text className="font-bold text-[11px]" style={{ color: getStatusColor(selectedOrder.status) }}>
                                                    {getStatusLabel(selectedOrder.status)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                            <Text className="text-gray-400 text-[10px] font-bold uppercase">Status Bayar</Text>
                                            <Text className={`text-[11px] font-bold ${getPayStatusColor(selectedOrder)}`}>
                                                {getPayStatusLabel(selectedOrder)}
                                            </Text>
                                        </View>

                                        {selectedOrder.matching_status && selectedOrder.matching_status !== 'pending' && (
                                            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                                <Text className="text-gray-400 text-[10px] font-bold uppercase">Pencocokan</Text>
                                                <Text className="text-[11px] font-bold text-purple-600">
                                                    {getStatusLabel(selectedOrder.matching_status)}
                                                </Text>
                                            </View>
                                        )}

                                        {(selectedOrder as any).gomeet_link && (
                                            <View className="mt-2 pt-2 border-t border-gray-100">
                                                <View className="flex-row items-center">
                                                    <Video size={13} color="#633594" />
                                                    <Text className="ml-1.5 text-[10px] font-bold text-gray-400 uppercase">Jadwal Conference Call</Text>
                                                </View>
                                                <Text className="text-xs text-[#633594] font-semibold mt-1" numberOfLines={1}>
                                                    {(selectedOrder as any).gomeet_link}
                                                </Text>
                                                <Text className="text-[11px] text-gray-500 mt-0.5">
                                                    {(selectedOrder as any).call_date ? formatDate((selectedOrder as any).call_date) : '-'} • {(selectedOrder as any).call_slot || '-'}
                                                </Text>
                                            </View>
                                        )}

                                        {(selectedOrder as any).departure_method && (
                                            <View className="mt-2 pt-2 border-t border-gray-100">
                                                <Text className="text-[10px] font-bold text-gray-400 uppercase">Info Keberangkatan</Text>
                                                <Text className="text-xs text-gray-700 mt-1">
                                                    {(selectedOrder as any).departure_method === 'driver_online'
                                                        ? 'Pesankan Driver Online (bayar di tujuan)'
                                                        : 'Dijemput oleh User'}
                                                </Text>
                                                <Text className="text-[11px] text-gray-500 mt-0.5">
                                                    Tanggal: {(selectedOrder as any).departure_date ? formatDate((selectedOrder as any).departure_date) : '-'}
                                                </Text>
                                            </View>
                                        )}

                                        <View className="mt-2">
                                            <View className="flex-row items-center">
                                                <Calendar size={14} color="#6B7280" />
                                                <Text className="ml-2 text-xs text-gray-600">
                                                    {formatDateTime(selectedOrder.created_at)}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center mt-0.5">
                                                <Clock size={14} color="#6B7280" />
                                                <Text className="ml-2 text-xs text-gray-600">
                                                    {formatDate(selectedOrder.tgl)} • {selectedOrder.jam?.substring(0, 5) || '-'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1.5">Pelanggan</Text>
                                        <View className="flex-row items-center">
                                            <User size={14} color="#633594" />
                                            <Text className="ml-2 font-bold text-gray-800 text-sm">{selectedOrder.cust_nama || selectedOrder.kontak_nama}</Text>
                                        </View>
                                        <View className="flex-row items-center mt-0.5">
                                            <Phone size={12} color="#6B7280" />
                                            <Text className="ml-2 text-xs text-gray-600">{selectedOrder.cust_hp || selectedOrder.kontak_wa || '-'}</Text>
                                        </View>
                                        <View className="flex-row items-start mt-0.5">
                                            <MapPin size={12} color="#6B7280" className="mt-0.5" />
                                            <Text className="ml-2 text-xs text-gray-600 flex-1">{selectedOrder.alamat}</Text>
                                        </View>
                                    </View>

                                    <View className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1.5">Pekerja</Text>
                                        {selectedOrder.worker_nama ? (
                                            <>
                                                <View className="flex-row items-center">
                                                    <Users size={14} color="#633594" />
                                                    <Text className="ml-2 font-bold text-gray-800 text-sm">{selectedOrder.worker_nama}</Text>
                                                </View>
                                                <Text className="text-xs text-gray-500 mt-0.5">
                                                    {selectedOrder.worker_umur}th • {selectedOrder.worker_asal} • {selectedOrder.worker_exp}
                                                </Text>
                                                <Text className="text-xs font-semibold text-[#633594] mt-0.5">
                                                    Gaji: {formatRupiah(parseInt(selectedOrder.worker_gaji_min) || 0)}
                                                </Text>
                                            </>
                                        ) : (
                                            <Text className="text-xs text-gray-400">Belum ada pekerja</Text>
                                        )}
                                    </View>

                                    <View className="bg-white rounded-xl p-3 border border-gray-100">
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1.5">Biaya</Text>
                                        <View className="flex-row justify-between">
                                            <Text className="text-xs text-gray-500">Subtotal</Text>
                                            <Text className="text-xs font-medium">{formatRupiah(selectedOrder.sub_total)}</Text>
                                        </View>
                                        <View className="flex-row justify-between mt-0.5">
                                            <Text className="text-xs text-gray-500">Biaya App</Text>
                                            <Text className="text-xs font-medium">{formatRupiah(selectedOrder.biaya_app)}</Text>
                                        </View>
                                        {selectedOrder.diskon > 0 && (
                                            <View className="flex-row justify-between mt-0.5">
                                                <Text className="text-xs text-red-500">Diskon</Text>
                                                <Text className="text-xs text-red-500 font-medium">-{formatRupiah(selectedOrder.diskon)}</Text>
                                            </View>
                                        )}
                                        <View className="border-t border-dashed border-gray-200 mt-1.5 pt-1.5 flex-row justify-between">
                                            <Text className="font-bold text-gray-800 text-sm">Total</Text>
                                            <Text className="font-bold text-[#633594] text-sm">{formatRupiah(selectedOrder.total)}</Text>
                                        </View>
                                    </View>

                                    {selectedOrder.catatan && (
                                        <View className="bg-white rounded-xl p-3 border border-gray-100 mt-2">
                                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-0.5">Catatan</Text>
                                            <Text className="text-xs text-gray-600">{selectedOrder.catatan}</Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>

                        <View className="border-t border-gray-200 p-3 bg-white">
                            <View className="flex-row space-x-2">
                                <TouchableOpacity onPress={closeDetail} className="flex-1 bg-gray-100 py-2.5 rounded-xl">
                                    <Text className="text-gray-600 font-bold text-center text-sm">Tutup</Text>
                                </TouchableOpacity>
                                {selectedOrder && getNextStatuses(selectedOrder.status).length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setShowStatusModal(true)}
                                        className="flex-1 bg-[#633594] py-2.5 rounded-xl flex-row items-center justify-center"
                                    >
                                        <RefreshCw size={16} color="#fff" />
                                        <Text className="text-white font-bold text-center text-sm ml-1.5">Ubah Status</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ============================================================
                STATUS CHANGE MODAL
                ============================================================ */}
            <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
                <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setShowStatusModal(false)}>
                    <Pressable className="bg-white rounded-2xl p-5 w-11/12 max-w-sm" onPress={(e) => e.stopPropagation()}>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-lg font-bold text-gray-800">Ubah Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                                <XCircle size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {selectedOrder && (
                            <Text className="text-sm text-gray-500 mb-3">
                                Saat ini: <Text className="font-bold text-[#633594]">{getStatusLabel(selectedOrder.status)}</Text>
                            </Text>
                        )}

                        <ScrollView className="max-h-72">
                            {statusFlow.map((opt) => {
                                const isActive = selectedOrder?.status === opt.value;
                                const nextStatuses = selectedOrder ? getNextStatuses(selectedOrder.status) : [];
                                const isDisabled = !nextStatuses.includes(opt.value);

                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        onPress={() => !isDisabled && handleSelectStatus(opt.value)}
                                        disabled={!!isDisabled || updating}
                                        className={`flex-row items-center justify-between p-3 rounded-xl mb-1 ${isActive ? 'bg-[#633594]/10 border border-[#633594]' :
                                            isDisabled ? 'bg-gray-50 opacity-50' : 'bg-gray-50'
                                            }`}
                                    >
                                        <Text className={`text-sm font-medium ${isActive ? 'text-[#633594]' :
                                            isDisabled ? 'text-gray-400' : 'text-gray-700'
                                            }`}>
                                            {opt.label}
                                        </Text>
                                        {isActive && <CheckCircle size={18} color="#633594" />}
                                        {isDisabled && !isActive && (
                                            <Text className="text-[10px] text-gray-400">tidak tersedia</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity onPress={() => setShowStatusModal(false)} className="mt-3 bg-gray-100 py-2.5 rounded-xl">
                            <Text className="text-gray-600 font-medium text-center">Batal</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ============================================================
                ✅ MODAL JADWAL CONFERENCE CALL - FIXED
                ============================================================ */}
            <Modal visible={showCallScheduleModal} transparent animationType="fade" onRequestClose={() => {
                setShowCallScheduleModal(false);
                setCallErrors({});
            }}>
                <Pressable 
                    className="flex-1 bg-black/50 justify-center items-center px-4" 
                    onPress={() => {
                        setShowCallScheduleModal(false);
                        setCallErrors({});
                    }}
                >
                    <Pressable 
                        className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90%]" 
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="flex-row items-center gap-2 mb-1">
                                <Video size={20} color="#633594" />
                                <Text className="text-lg font-bold text-gray-800">Jadwalkan Conference Call</Text>
                            </View>
                            <Text className="text-xs text-gray-400 mb-4">
                                {selectedOrder?.cust_nama || selectedOrder?.kontak_nama || '-'}
                            </Text>

                            {/* Link Gomeet */}
                            <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Link Gomeet *</Text>
                            <View className={`bg-gray-50 rounded-xl border ${callErrors.link ? 'border-red-500' : 'border-gray-100'} px-4 mb-1`}>
                                <TextInput
                                    className="py-3 text-gray-700"
                                    value={gomeetLink}
                                    onChangeText={(text) => {
                                        setGomeetLink(text);
                                        setCallErrors(prev => ({...prev, link: undefined}));
                                    }}
                                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                    editable={!updating}
                                />
                            </View>
                            {callErrors.link && (
                                <Text className="text-red-500 text-[10px] mb-2">{callErrors.link}</Text>
                            )}

                            {/* Tanggal Call - Support Web & Mobile */}
                            <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Tanggal Call *</Text>
                            <View className={`bg-gray-50 rounded-xl border ${callErrors.date ? 'border-red-500' : 'border-gray-100'} px-4 mb-1`}>
                                <View className="flex-row items-center">
                                    <Calendar size={16} color="#9CA3AF" />
                                    
                                    {/* ✅ WEB: input type date */}
                                    {Platform.OS === 'web' ? (
                                        <input
                                            type="date"
                                            className="flex-1 py-3 text-gray-700 ml-2 bg-transparent outline-none"
                                            style={{
                                                minWidth: 0,
                                                width: '100%',
                                                border: 'none',
                                                outline: 'none',
                                                fontSize: '14px',
                                                fontFamily: 'inherit',
                                            }}
                                            value={callDate}
                                            onChange={(e) => {
                                                setCallDate(e.target.value);
                                                setCallErrors(prev => ({...prev, date: undefined}));
                                            }}
                                            min={getTodayDate()}
                                            disabled={updating}
                                        />
                                    ) : (
                                        /* ✅ MOBILE: TextInput */
                                        <TextInput
                                            className="flex-1 py-3 text-gray-700 ml-2"
                                            value={callDate}
                                            onChangeText={(text) => {
                                                setCallDate(text);
                                                setCallErrors(prev => ({...prev, date: undefined}));
                                            }}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#9CA3AF"
                                            editable={!updating}
                                        />
                                    )}
                                    
                                    {/* Tombol Hari Ini */}
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setCallDate(getTodayDate());
                                            setCallErrors(prev => ({...prev, date: undefined}));
                                        }}
                                        className="ml-1 px-2 py-1 bg-purple-100 rounded-lg"
                                        disabled={updating}
                                    >
                                        <Text className="text-[#633594] text-[10px] font-bold">Hari Ini</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {callErrors.date && (
                                <Text className="text-red-500 text-[10px] mb-2">{callErrors.date}</Text>
                            )}
                            <Text className="text-[10px] text-gray-400 mb-3">
                                Format: YYYY-MM-DD (contoh: {getTodayDate()})
                            </Text>

                            {/* Pilih Slot Jam */}
                            <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Jam Call (batas akhir 17.00) *</Text>
                            <View className="flex-row flex-wrap gap-2 mb-1">
                                {CALL_SLOTS.map((slot) => (
                                    <Pressable
                                        key={slot}
                                        onPress={() => {
                                            setCallSlot(slot);
                                            setCallErrors(prev => ({...prev, slot: undefined}));
                                        }}
                                        disabled={updating}
                                        className={`px-3 py-2 rounded-xl border ${
                                            callSlot === slot 
                                                ? 'bg-[#633594] border-[#633594]' 
                                                : 'bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <Text className={`text-xs font-bold ${
                                            callSlot === slot ? 'text-white' : 'text-gray-600'
                                        }`}>
                                            {slot}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                            {callErrors.slot && (
                                <Text className="text-red-500 text-[10px] mb-3">{callErrors.slot}</Text>
                            )}
                            {!callErrors.slot && <View className="mb-3" />}

                            {/* Tombol Aksi */}
                            <View className="flex-row gap-3 mt-2">
                                <Pressable
                                    onPress={() => {
                                        setShowCallScheduleModal(false);
                                        setCallErrors({});
                                        setGomeetLink('');
                                        setCallDate('');
                                        setCallSlot('');
                                    }}
                                    disabled={updating}
                                    className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
                                >
                                    <Text className="font-bold text-gray-600">Batal</Text>
                                </Pressable>
                                <Pressable
                                    onPress={submitCallSchedule}
                                    disabled={updating}
                                    className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
                                        updating ? 'bg-gray-300' : 'bg-[#633594]'
                                    }`}
                                >
                                    {updating && <ActivityIndicator size="small" color="#fff" />}
                                    <Text className="font-bold text-white">
                                        {updating ? 'Menyimpan...' : 'Kirim Jadwal'}
                                    </Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ============================================================
                MODAL KEBERANGKATAN
                ============================================================ */}
            <Modal visible={showDepartureModal} transparent animationType="fade" onRequestClose={() => setShowDepartureModal(false)}>
                <Pressable className="flex-1 bg-black/50 justify-center items-center px-6" onPress={() => setShowDepartureModal(false)}>
                    <Pressable className="bg-white rounded-2xl p-5 w-full max-w-sm" onPress={(e) => e.stopPropagation()}>
                        <Text className="text-lg font-bold text-gray-800 mb-1">Konfirmasi Keberangkatan</Text>
                        <Text className="text-xs text-gray-400 mb-4">
                            {selectedOrder?.worker_nama || '-'} siap diantar ke {selectedOrder?.cust_nama || selectedOrder?.kontak_nama || 'pelanggan'}
                        </Text>

                        <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Metode Keberangkatan</Text>
                        <View className="gap-2 mb-4">
                            <Pressable
                                onPress={() => setDepartureMethod('driver_online')}
                                disabled={updating}
                                className={`p-3 rounded-xl border ${departureMethod === 'driver_online' ? 'bg-[#633594]/10 border-[#633594]' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Text className={`text-sm font-bold ${departureMethod === 'driver_online' ? 'text-[#633594]' : 'text-gray-700'}`}>
                                    Pesankan Driver Online
                                </Text>
                                <Text className="text-[11px] text-gray-400 mt-0.5">Pembayaran dilakukan oleh user di tujuan</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setDepartureMethod('dijemput_user')}
                                disabled={updating}
                                className={`p-3 rounded-xl border ${departureMethod === 'dijemput_user' ? 'bg-[#633594]/10 border-[#633594]' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Text className={`text-sm font-bold ${departureMethod === 'dijemput_user' ? 'text-[#633594]' : 'text-gray-700'}`}>
                                    Dijemput oleh User
                                </Text>
                            </Pressable>
                        </View>

                        <Text className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Tanggal Keberangkatan</Text>
                        <View className="bg-gray-50 rounded-xl border border-gray-100 px-4 mb-5">
                            <TextInput
                                className="py-3 text-gray-700"
                                value={departureDate}
                                onChangeText={setDepartureDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#9CA3AF"
                                editable={!updating}
                            />
                        </View>

                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={() => setShowDepartureModal(false)}
                                disabled={updating}
                                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
                            >
                                <Text className="font-bold text-gray-600">Batal</Text>
                            </Pressable>
                            <Pressable
                                onPress={submitDeparture}
                                disabled={updating}
                                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${updating ? 'bg-gray-300' : 'bg-[#633594]'}`}
                            >
                                {updating && <ActivityIndicator size="small" color="#fff" />}
                                <Text className="font-bold text-white">{updating ? 'Menyimpan...' : 'Konfirmasi'}</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Toast />
        </View>
    );
}