import { ApiResponse, Order } from "../types/order";
import API from "../utils/api";

export const orderService = {
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
};
