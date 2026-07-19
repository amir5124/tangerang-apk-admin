// types/order.ts
export interface OrderItem {
  nama: string;
  qty: number;
  hargaSatuan: number;
}

export interface Order {
  id: number;
  customer_id: number;
  store_id: number;
  service_id: number | null;
  order_date: string;
  scheduled_date: string;
  scheduled_time: string;
  building_type: string;
  address_customer: string;
  lat_customer: number | null;
  lng_customer: number | null;
  total_price: string;
  subtotal: string | null;
  platform_fee: string;
  discount_amount: number;
  notes: string;
  service_fee: string;
  protection_fee?: number | string;
  transaction_fee: string | null;
  shipping_fee: string | null;
  order_type: "service" | "product" | null;
  delivery_option: "instant" | "scheduled" | null;
  protection: number | null;
  voucher_id: number | null;
  voucher_code: string | null;
  status: "unpaid" | "pending" | "accepted" | "on_the_way" | "working" | "completed" | "cancelled";
  proof_image_url: string | null;
  customer_notes: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  payment_method: string | null;
  payment_type: string | null;
  payment_status: string | null;
  items: string | OrderItem[];
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_fcm: string | null;
  mitra_name: string;
  mitra_phone: string;
  store_name: string;
  already_rated: number | null;

  // ✅ Tambahan field untuk produk
  recipient_name?: string | null;        // Nama penerima
  recipient_phone?: string | null;       // No HP penerima
  tracking_number?: string | null;       // Nomor resi
  courier_name?: string | null;          // Nama kurir
  estimated_delivery?: string | null;    // Estimasi pengiriman
  weight?: number | null;                // Berat produk (kg)
  shipping_address_note?: string | null; // Catatan alamat pengiriman
  delivery_instruction?: string | null;  // Instruksi pengiriman
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}