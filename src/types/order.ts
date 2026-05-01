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
  platform_fee: string;
discount_amount: number;
notes: string;
  service_fee: string;
  status: "unpaid" | "accepted" | "on_the_way" | "working" | "completed" | "cancelled";
  proof_image_url: string | null;
  customer_notes: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  payment_method: string | null; // Tambahkan ini
  payment_type: string | null; // Tambahkan ini
  payment_status: string | null; // Tambahkan ini
  items: string | OrderItem[];
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_fcm: string | null;
  mitra_name: string;
  mitra_phone: string;
  store_name: string;
  already_rated: number | null; // Untuk menyimpan nilai rating (1-5)
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
