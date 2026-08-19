import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, injectLogout } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. FONCTION DE DÉCONNEXION STABILISÉE ---
  const logout = useCallback(async () => {
    try {
      if (driverData && userToken) {
        // Tentative de mise à jour du statut avant déconnexion
        authApi.updateOnlineStatus(driverData.id, 0, userToken).catch(() => {});
      }
    } catch (e) {
      console.log("Erreur pendant logout:", e);
    } finally {
      // Nettoyage des données locales
      setUserToken(null);
      setDriverData(null);
      await AsyncStorage.multiRemove(['userToken', 'driverData']);
      console.log("Session fermée localement.");
    }
  }, [userToken, driverData]);

  // --- 2. LIAISON AVEC L'INTERCEPTEUR API ---
  useEffect(() => {
    injectLogout(logout);
  }, [logout]);

  // --- CHARGEMENT DES DONNÉES AU DÉMARRAGE ---
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const [storedToken, storedDriver] = await Promise.all([
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem('driverData'),
        ]);

        if (storedToken && storedDriver) {
          setUserToken(storedToken);
          setDriverData(JSON.parse(storedDriver));
        }
      } catch (e) {
        console.error('Erreur chargement storage:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const saveSession = async (token, driver) => {
    try {
      setUserToken(token);
      setDriverData(driver);
      await Promise.all([
        AsyncStorage.setItem('userToken', token),
        AsyncStorage.setItem('driverData', JSON.stringify(driver)),
      ]);
    } catch (e) {
      console.error('Erreur sauvegarde session:', e);
    }
  };

  // --- FONCTION REGISTER (AJOUT IDENTIFICATION_NO) ---
  const register = async (firstName, lastName, email, phone, password, identificationNo, usr_cre) => {
    try {
      // On passe identificationNo à l'API
      const data = await authApi.register(
        firstName, 
        lastName, 
        email, 
        phone, 
        password, 
        identificationNo, 
        usr_cre
      );
      return { success: true, data };
    } catch (error) {
      // IMPORTANT : On retourne error.message pour que l'Alert s'affiche
      return {
        success: false,
        message: error.message || error || "Erreur lors de l'inscription",
      };
    }
  };

  const login = async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      if (data && data.success) {
        await saveSession(data.token, data.driver);
        return { success: true };
      }
      return {
        success: false,
        message: data?.message || 'Identifiants invalides',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur de connexion au serveur',
      };
    }
  };

  const refreshProfile = async () => {
    if (!userToken || !driverData) return;
    try {
      const data = await authApi.getProfile(driverData.id, userToken);
      if (data.success) {
        setDriverData(data.profile);
        await AsyncStorage.setItem('driverData', JSON.stringify(data.profile));
      }
    } catch (error) {
      console.error('Erreur rafraîchissement profil:', error);
    }
  };

  const updateProfile = async (userData) => {
    try {
      const data = await authApi.updateProfile(driverData.id, userData, userToken);
      if (data.success) {
        await refreshProfile();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message || "Erreur de mise à jour" };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const data = await authApi.forgotPassword(email);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      const data = await authApi.resetPassword(email, code, newPassword);
      return { success: true, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Code invalide ou expiré',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        driverData,
        isLoading,
        register,
        login,
        logout,
        refreshProfile,
        updateProfile,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);