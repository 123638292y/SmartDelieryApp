import axios from 'axios';
import { Platform } from 'react-native';

const IP_LOCALE = "192.168.1.103"; 
const BASE_URL_SERVER = Platform.OS === 'web' 
  ? `http://localhost:5000/api` 
  : `http://${IP_LOCALE}:5000/api`;

let logoutHandler = () => {}; 
export const injectLogout = (fn) => {
  logoutHandler = fn;
};

const apiClient = axios.create({
  baseURL: BASE_URL_SERVER,
  timeout: 20000,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.message || "";
    if (error.response?.status === 401 || message === "Token invalide ou expiré") {
      if (logoutHandler) logoutHandler(); 
    }
    return Promise.reject(error);
  }
);

const handleError = (error) => {
  return error.response?.data?.message || error.message || "Erreur serveur";
};

export const authApi = {
  register: async (first_name, last_name, email, phone, password, identification_no, usr_cre) => {
    try {
      const response = await apiClient.post(`/auth/register`, {
        first_name, last_name, email, phone, password, identification_no,
        usr_cre: usr_cre || first_name.substring(0, 15),
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  login: async (email, password) => {
    try {
      const response = await apiClient.post(`/auth/login`, { email, password });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  logout: async (token) => {
    try {
      const response = await apiClient.post(`/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getProfile: async (id_driver, token) => {
    try {
      const response = await apiClient.get(`/auth/profile/${id_driver}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },
};

export const routeApi = {
  getDriverDeliveries: async (identification_no, token) => {
    try {
      const response = await apiClient.get(`/route/deliveries/${identification_no}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getOptimizedRoute: async (identification_no, token, lat, lng, id_delivery_start = null) => {
    try {
      const params = { lat, lng };
      if (id_delivery_start) {
        params.id_delivery_start = id_delivery_start;
      }
      const response = await apiClient.get(`/route/optimized-route/${identification_no}`, {
        params: params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getPredictedSpeeds: async (token) => {
    try {
      const response = await apiClient.get(`/route/predict-speed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },
};

export const livraisonApi = {
  getClusteredDeliveries: async (nbClusters, token) => {
    try {
      const response = await apiClient.get(`/livraisons/cluster`, {
        params: { nb_clusters: nbClusters },
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  assignDelivery: async (id_doc, id_driver, token) => {
    try {
      const response = await apiClient.post(`/livraisons/assign`, 
        { id_doc, id_driver }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getLivraisonsToday: async (identification_no, token) => {
    try {
      const response = await apiClient.get(`/livraisons/today/${identification_no}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getLivraisonDetail: async (id_doc, token) => {
    try {
      const response = await apiClient.get(`/livraisons/detail/${id_doc}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  updateDetailQuantity: async (id_detail, new_qte, token) => {
    try {
        const response = await apiClient.put(`/livraisons/detail/qte/${id_detail}`, 
            { new_qte: Number(new_qte) },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error(handleError(error));
    }
  },

  updateLivraisonStatus: async (id_doc, status, token) => {
    try {
      const response = await apiClient.put(`/livraisons/status/${id_doc}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getDeliveryStats: async (identification_no, token) => {
    try {
      const response = await apiClient.get(`/livraisons/stats/${identification_no}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  // --- NOUVELLE FONCTION AJOUTÉE ---
  getDriverHistory: async (identification_no, token) => {
    try {
      const response = await apiClient.get(`/livraisons/historique/${identification_no}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },
};

export const notificationApi = {
  getNotifications: async (id_user, token) => {
    try {
      const response = await apiClient.get(`/notifications/${id_user}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  getUnreadCount: async (id_user, token) => {
    try {
      const response = await apiClient.get(`/notifications/count/${id_user}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  markAsRead: async (id_notif, token) => {
    try {
      const response = await apiClient.put(`/notifications/${id_notif}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  markAllAsRead: async (id_user, token) => {
    try {
      const response = await apiClient.put(`/notifications/read-all/${id_user}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  deleteNotification: async (id_notif, token) => {
    try {
      const response = await apiClient.delete(`/notifications/${id_notif}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  }
};

export default { apiClient, authApi, routeApi, livraisonApi, notificationApi };