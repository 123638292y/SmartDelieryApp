import axios from 'axios';

const API_URL = "http://localhost:5000/api/";

// 1. Création d'une instance Axios
const api = axios.create({
  baseURL: API_URL,
});

// 2. Ajout d'un intercepteur pour injecter le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- AUTH SERVICE ---
export const adminAuthService = {
  login: async (email, password) => {
    try {
      const response = await api.post('admin/authadmin/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Erreur serveur" };
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('admin/authadmin/update-profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('admin/authadmin/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  resetPassword: async (email, code, newPassword) => {
    try {
      const response = await api.post('admin/authadmin/reset-password', { email, code, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
  }
};

// affectationService.js

export const affectationService = {
  
  // 1. Récupérer tous les livreurs (pour les menus de sélection)
  // Route : GET /api/affectation/drivers
  getAllDrivers: async () => {
    try {
      const response = await api.get('admin/affectation/drivers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 2. Récupérer toutes les livraisons (vue globale carte/liste)
  // Route : GET /api/affectation/deliveries
  getAllDeliveries: async () => {
    try {
      const response = await api.get('admin/affectation/deliveries');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 3. Récupérer les livraisons groupées par livreur (Statistiques)
  // Note : Si id est vide, le backend renvoie tous les livreurs
  // Route : GET /api/affectation/per-driver/:id?
getDeliveriesPerDriver: async (id = '') => {
  try {
    // Si id existe, on ajoute "/id", sinon on ajoute une chaîne vide
    const url = `admin/affectation/per-driver${id ? `/${id}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
},

  // 4. Affectation manuelle d'un bon à un livreur
  // Route : POST /api/affectation/assign | Body : { id_doc, id_driver }
  assignDelivery: async (id_doc, id_driver) => {
    try {
      const response = await api.post('admin/affectation/assign', { 
        id_doc, 
        id_driver 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 5. Supprimer une affectation (Désassigner)
  // Route : DELETE /api/affectation/unassign/:id_doc
  unassignDelivery: async (id_doc) => {
    try {
      const response = await api.delete(`admin/affectation/unassign/${id_doc}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 6. Liste des affectations détaillées pour un livreur spécifique
  // Route : GET /api/affectation/assignments/driver/:id_driver
  getDriverAssignments: async (id_driver) => {
    try {
      const response = await api.get(`admin/affectation/assignments/driver/${id_driver}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // 7. Lancer l'algorithme d'affectation automatique (AI Clustering)
  // Route : POST /api/affectation/auto-assign
  autoAssignDeliveries: async () => {
    try {
      const response = await api.post('admin/affectation/auto-assign', {});
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};
// --- DRIVER SERVICE ---
export const driverService = {
  getAllDrivers: async () => {
    try {
      const response = await api.get('drivers');
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  getDriverById: async (id) => {
    try {
      const response = await api.get(`drivers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  createDriver: async (driverData) => {
    try {
      const response = await api.post('drivers', driverData);
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  updateDriver: async (id, driverData) => {
    try {
      const response = await api.put(`drivers/${id}`, driverData);
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  deleteDriver: async (id) => {
    try {
      const response = await api.delete(`drivers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  }
};

// --- STATS SERVICE ---
export const statsService = {
  getGlobalStats: async () => {
    try {
      const response = await api.get('admin/stats/global');
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  getDriversPerformance: async () => {
    try {
      const response = await api.get('admin/stats/drivers');
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  getMonthlyEvolution: async () => {
    try {
      const response = await api.get('admin/stats/evolution');
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  getTopClients: async () => {
    try {
      const response = await api.get('admin/stats/top-clients');
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  },

  getDashboardSummary: async () => {
    try {
      const response = await api.get('admin/stats/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data;
    }
  }
};