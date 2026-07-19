import axios from "axios";
import { ApiResponse, Order } from "../types/order";
import API from "../utils/api";

// ✅ Ubah base URL sesuai dengan backend
// Backend pake /api/pesanan, bukan /api/art/pesanan
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
   * ✅ Ubah dari /art/pesanan ke /pesanan
   */
  getAllOrdersArt: async () => {
    const response = await axios.get(`${API_BASE_URL}/pesanan`);
    return response.data;
  },

  /**
   * Get detail pesanan ART/Babysitter by ID
   * ✅ Ubah dari /art/pesanan/:id ke /pesanan/:id
   */
  getDetailOrderArt: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/${id}`);
    return response.data;
  },

  /**
   * Update status pesanan ART/Babysitter (admin)
   * ✅ Ubah dari /art/pesanan/:id/status ke /pesanan/:id/status
   */
  updateStatusArt: async (id: string, status: string) => {
    const response = await axios.put(`${API_BASE_URL}/pesanan/${id}/status`, { status });
    return response.data;
  },

  /**
   * Update matching status (admin)
   * ✅ Ubah dari /art/pesanan/:id/matching ke /pesanan/:id/matching
   */
  updateMatchingStatus: async (id: string, matching_status: string) => {
    const response = await axios.put(`${API_BASE_URL}/pesanan/${id}/matching`, { matching_status });
    return response.data;
  },

  /**
   * Get pesanan ART by status (admin filter)
   * ✅ Ubah dari /art/pesanan/status/:status ke /pesanan/status/:status
   */
  getOrdersArtByStatus: async (status: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/status/${status}`);
    return response.data;
  },

  /**
   * Get pesanan ART by matching status (admin filter)
   * ✅ Ubah dari /art/pesanan/matching/:matchingStatus ke /pesanan/matching/:matchingStatus
   */
  getOrdersArtByMatchingStatus: async (matchingStatus: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/matching/${matchingStatus}`);
    return response.data;
  },

  /**
   * Delete pesanan ART (admin)
   * ✅ Ubah dari /art/pesanan/:id ke /pesanan/:id
   */
  deleteOrderArt: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/pesanan/${id}`);
    return response.data;
  },

  /**
   * Get statistik pesanan ART (admin)
   * ✅ Ubah dari /art/pesanan/statistik ke /pesanan/statistik
   */
  getStatistikOrderArt: async () => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/statistik`);
    return response.data;
  },

  /**
   * Get laporan per tanggal ART (admin)
   * ✅ Ubah dari /art/pesanan/laporan ke /pesanan/laporan
   */
  getLaporanPerTanggal: async (startDate: string, endDate: string) => {
    const response = await axios.get(`${API_BASE_URL}/pesanan/laporan`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
};

// ============================================================
// TYPE DEFINITIONS
// ============================================================
export interface ArtOrderResponse {
  success: boolean;
  message: string;
  data: ArtOrder | ArtOrder[];
  total?: number;
}

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
  status: 'pending' | 'paid' | 'matching' | 'approved' | 'calling' | 'working' | 'done' | 'completed' | 'rejected' | 'cancelled';
  matching_status: 'pending' | 'matching' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

// ============================================================
// HELPER FUNCTIONS UNTUK STATUS
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
  CANCELLED: 'cancelled' as const,

  MATCHING_PENDING: 'pending' as const,
  MATCHING_SEARCHING: 'matching' as const,
  MATCHING_APPROVED: 'approved' as const,
  MATCHING_REJECTED: 'rejected' as const,

  getStatusLabel: (status: string): string => {
    const map: Record<string, string> = {
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
    return map[status] || status;
  },

  getStatusColor: (status: string): string => {
    const map: Record<string, string> = {
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
    return map[status] || '#6B7280';
  },

  getStatusBg: (status: string): string => {
    const map: Record<string, string> = {
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
      'matching': ['approved', 'rejected', 'cancelled'],
      'approved': ['calling', 'cancelled'],
      'calling': ['working', 'cancelled'],
      'working': ['done', 'cancelled'],
      'done': [],
      'completed': [],
      'rejected': [],
      'cancelled': []
    };
    return flow[currentStatus] || [];
  },

  isValidStatus: (status: string): boolean => {
    const valid = ['pending', 'paid', 'matching', 'approved', 'calling', 'working', 'done', 'completed', 'rejected', 'cancelled'];
    return valid.includes(status);
  },

  getStatusOptions: () => {
    return [
      { value: 'pending', label: 'Menunggu Pembayaran' },
      { value: 'paid', label: 'Dibayar' },
      { value: 'matching', label: 'Mencari Pekerja' },
      { value: 'approved', label: 'Disetujui' },
      { value: 'calling', label: 'Menghubungi' },
      { value: 'working', label: 'Sedang Bekerja' },
      { value: 'done', label: 'Selesai' },
      { value: 'rejected', label: 'Ditolak' },
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