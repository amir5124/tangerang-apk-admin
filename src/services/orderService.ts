import axios from "axios";
import { ApiResponse, Order } from "../types/order";
import API from "../utils/api";

// ✅ Ubah base URL sesuai dengan backend
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://backend.tangerangfast.online/api';

export const orderService = {
  // ============================================================
  // EXISTING FUNCTIONS
  // ============================================================
  getMyOrders: async (userId: string | number) => {
    const response = await API.get<ApiResponse<Order[]>>(`/orders/user/${userId}`);
    return response.data;
  },

  getDetailOrder: async (orderId: string | number) => {
    const response = await API.get<ApiResponse<Order>>(`/orders/detail/${orderId}`);
    return response.data;
  },

  getAllOrdersAdmin: async () => {
    const response = await API.get<ApiResponse<Order[]>>("/orders/admin/all");
    return response.data;
  },

  // ============================================================
  // FUNGSI ADMIN ART/BABYSITTER - PAKAI /api/pesanan
  // ============================================================

  /**
   * Get SEMUA pesanan ART/Babysitter (untuk admin)
   */
  getAllOrdersArt: async () => {
    const response = await axios.get(`${API_BASE_URL}/pesanan`);
    return response.data;
  },

  /**
   * Get detail pesanan ART/Babysitter by ID
   */
  getDetailOrderArt: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/${id}`);
    return response.data;
  },

  /**
   * ✅ UPDATE STATUS PESANAN - FIXED
   * Menerima extraPayload untuk field tambahan (gomeet_link, call_date, call_slot, dll)
   */
  updateStatusArt: async (id: string, status: string, extraPayload?: Record<string, any>) => {
    // Build payload - SELALU kirim status
    const payload: any = { status };
    
    // Jika ada extraPayload, tambahkan ke payload
    if (extraPayload) {
      // Untuk status 'calling', kirim semua field yang diperlukan
      if (status === 'calling') {
        payload.gomeet_link = extraPayload.gomeet_link || '';
        payload.call_date = extraPayload.call_date || '';
        payload.call_slot = extraPayload.call_slot || '';
      }
      
      // Untuk status 'berangkat_siap_diantar'
      if (status === 'berangkat_siap_diantar') {
        payload.departure_method = extraPayload.departure_method || '';
        payload.departure_date = extraPayload.departure_date || '';
      }
      
      // Tambahkan field lain jika ada
      Object.keys(extraPayload).forEach(key => {
        if (!['gomeet_link', 'call_date', 'call_slot', 'departure_method', 'departure_date'].includes(key)) {
          payload[key] = extraPayload[key];
        }
      });
    }

    console.log('📤 updateStatusArt - Sending payload:', JSON.stringify(payload, null, 2));

    const response = await axios.put(
      `${API_BASE_URL}/pesanan/${id}/status`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('✅ updateStatusArt - Response:', response.data);
    return response.data;
  },

  /**
   * Update matching status (admin)
   */
  updateMatchingStatus: async (id: string, matching_status: string) => {
    const response = await axios.put(`${API_BASE_URL}/pesanan/${id}/matching`, { matching_status });
    return response.data;
  },

  /**
   * Get pesanan ART by status (admin filter)
   */
  getOrdersArtByStatus: async (status: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/status/${status}`);
    return response.data;
  },

  /**
   * Get pesanan ART by matching status (admin filter)
   */
  getOrdersArtByMatchingStatus: async (matchingStatus: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/matching/${matchingStatus}`);
    return response.data;
  },

  /**
   * Delete pesanan ART (admin)
   */
  deleteOrderArt: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/pesanan/${id}`);
    return response.data;
  },

  /**
   * Get statistik pesanan ART (admin)
   */
  getStatistikOrderArt: async () => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/statistik`);
    return response.data;
  },

  /**
   * Get laporan per tanggal ART (admin)
   */
  getLaporanPerTanggal: async (startDate: string, endDate: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/laporan`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
};

// ============================================================
// TYPE DEFINITIONS - UPDATE dengan field baru
// ============================================================
export interface ArtOrder {
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
  status: 'pending' | 'paid' | 'matching' | 'approved' | 'calling' | 'working' | 'done' | 'completed' | 'rejected' | 'cancelled' | 'rejected_searching' | 'berangkat_dari_cicana' | 'berangkat_cek_kesehatan' | 'berangkat_siap_diantar';
  matching_status: 'pending' | 'matching' | 'approved' | 'rejected';
  // ✅ FIELD BARU untuk Conference Call
  gomeet_link?: string;
  call_date?: string;
  call_slot?: string;
  departure_method?: string;
  departure_date?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// HELPER FUNCTIONS UNTUK STATUS - UPDATE
// ============================================================
export const ArtOrderStatus = {
  PENDING: 'pending' as const,
  PAID: 'paid' as const,
  MATCHING: 'matching' as const,
  APPROVED: 'approved' as const,
  CALLING: 'calling' as const,
  WORKING: 'working' as const,
  DONE: 'done' as const,
  COMPLETED: 'completed' as const,
  REJECTED: 'rejected' as const,
  REJECTED_SEARCHING: 'rejected_searching' as const,
  CANCELLED: 'cancelled' as const,
  BERANGKAT_DARI_CICANA: 'berangkat_dari_cicana' as const,
  BERANGKAT_CEK_KESEHATAN: 'berangkat_cek_kesehatan' as const,
  BERANGKAT_SIAP_DIANTAR: 'berangkat_siap_diantar' as const,

  MATCHING_PENDING: 'pending' as const,
  MATCHING_SEARCHING: 'matching' as const,
  MATCHING_APPROVED: 'approved' as const,
  MATCHING_REJECTED: 'rejected' as const,

  getStatusLabel: (status: string): string => {
    const map: Record<string, string> = {
      'pending': 'Menunggu Pembayaran',
      'paid': 'Dibayar',
      'matching': 'Pencocokan',
      'approved': 'Disetujui',
      'calling': 'Conference Call',
      'working': 'Sedang Bekerja',
      'berangkat_dari_cicana': 'Berangkat dari Cicana',
      'berangkat_cek_kesehatan': 'Cek Kesehatan',
      'berangkat_siap_diantar': 'Siap Diantar',
      'done': 'Selesai',
      'completed': 'Selesai',
      'rejected': 'Ditolak',
      'rejected_searching': 'Ditolak - Masih Mencari',
      'cancelled': 'Dibatalkan'
    };
    return map[status] || status;
  },

  getStatusColor: (status: string): string => {
    const map: Record<string, string> = {
      'pending': '#F59E0B',
      'paid': '#3B82F6',
      'matching': '#8B5CF6',
      'approved': '#10B981',
      'calling': '#EC4899',
      'working': '#F97316',
      'berangkat_dari_cicana': '#0EA5E9',
      'berangkat_cek_kesehatan': '#14B8A6',
      'berangkat_siap_diantar': '#22C55E',
      'done': '#10B981',
      'completed': '#10B981',
      'rejected': '#EF4444',
      'rejected_searching': '#FB923C',
      'cancelled': '#EF4444'
    };
    return map[status] || '#6B7280';
  },

  getStatusBg: (status: string): string => {
    const map: Record<string, string> = {
      'pending': 'bg-yellow-50',
      'paid': 'bg-blue-50',
      'matching': 'bg-purple-50',
      'approved': 'bg-green-50',
      'calling': 'bg-pink-50',
      'working': 'bg-orange-50',
      'berangkat_dari_cicana': 'bg-sky-50',
      'berangkat_cek_kesehatan': 'bg-teal-50',
      'berangkat_siap_diantar': 'bg-emerald-50',
      'done': 'bg-green-50',
      'completed': 'bg-green-50',
      'rejected': 'bg-red-50',
      'rejected_searching': 'bg-orange-50',
      'cancelled': 'bg-red-50'
    };
    return map[status] || 'bg-gray-50';
  },

  getMatchingStatusLabel: (status: string): string => {
    const map: Record<string, string> = {
      'pending': 'Menunggu',
      'matching': 'Sedang Mencari',
      'approved': 'Disetujui',
      'rejected': 'Ditolak'
    };
    return map[status] || status;
  },

  getNextStatuses: (currentStatus: string): string[] => {
    const flow: Record<string, string[]> = {
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
      'done': [],
      'completed': [],
      'cancelled': []
    };
    return flow[currentStatus] || [];
  },

  isValidStatus: (status: string): boolean => {
    const valid = ['pending', 'paid', 'matching', 'approved', 'calling', 'working', 'berangkat_dari_cicana', 'berangkat_cek_kesehatan', 'berangkat_siap_diantar', 'done', 'completed', 'rejected', 'rejected_searching', 'cancelled'];
    return valid.includes(status);
  },

  getStatusOptions: () => {
    return [
      { value: 'pending', label: 'Menunggu Pembayaran' },
      { value: 'paid', label: 'Dibayar' },
      { value: 'matching', label: 'Pencocokan' },
      { value: 'approved', label: 'Disetujui' },
      { value: 'calling', label: 'Conference Call' },
      { value: 'working', label: 'Sedang Bekerja' },
      { value: 'berangkat_dari_cicana', label: 'Berangkat dari Cicana' },
      { value: 'berangkat_cek_kesehatan', label: 'Cek Kesehatan' },
      { value: 'berangkat_siap_diantar', label: 'Siap Diantar' },
      { value: 'done', label: 'Selesai' },
      { value: 'rejected', label: 'Ditolak' },
      { value: 'rejected_searching', label: 'Ditolak - Masih Mencari' },
      { value: 'cancelled', label: 'Dibatalkan' }
    ];
  },

  getMatchingStatusOptions: () => {
    return [
      { value: 'pending', label: 'Menunggu' },
      { value: 'matching', label: 'Sedang Mencari' },
      { value: 'approved', label: 'Disetujui' },
      { value: 'rejected', label: 'Ditolak' }
    ];
  }
};

export default orderService;