import axios from "axios";
import API from "../utils/api";

export const withdrawService = {
  getAllWithdrawHistory: async () => {
    try {
      const response = await axios.get(`${API}/api/disburse/admin/all-history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
