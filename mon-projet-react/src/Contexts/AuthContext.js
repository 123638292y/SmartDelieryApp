import React, { createContext, useContext, useEffect, useState } from 'react';
import { adminAuthService } from '../services/api'; // Vérifie le chemin

const AuthAdminContext = createContext();

export const AuthAdminProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('adminToken') || null);
    const [loading, setLoading] = useState(true);

    // Charger l'admin au démarrage si un token existe
    useEffect(() => {
        const savedAdmin = localStorage.getItem('adminData');
        if (savedAdmin && token) {
            setAdmin(JSON.parse(savedAdmin));
        }
        setLoading(false);
    }, [token]);

    // 1. Login
    const login = async (email, password) => {
        try {
            const res = await adminAuthService.login(email, password);
            if (res.success) {
                setToken(res.token);
                setAdmin(res.admin);
                localStorage.setItem('adminToken', res.token);
                localStorage.setItem('adminData', JSON.stringify(res.admin));
                return { success: true };
            }
        } catch (error) {
            return { success: false, message: error.message || "Erreur de connexion" };
        }
    };

    // 2. Logout
    const logout = () => {
        adminAuthService.logout();
        setAdmin(null);
        setToken(null);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
    };

    // 3. Update Profile
    const updateProfile = async (profileData) => {
        try {
            const res = await adminAuthService.updateProfile(profileData);
            if (res.success) {
                // On met à jour l'état local avec les nouvelles données envoyées
                const updatedAdmin = { ...admin, ...profileData };
                setAdmin(updatedAdmin);
                localStorage.setItem('adminData', JSON.stringify(updatedAdmin));
                return { success: true };
            }
        } catch (error) {
            return { success: false, message: error.message || "Erreur de mise à jour" };
        }
    };

    // 4. Forgot Password
    const forgotPassword = async (email) => {
        try {
            return await adminAuthService.forgotPassword(email);
        } catch (error) {
            throw error;
        }
    };

    // 5. Reset Password
    const resetPassword = async (email, code, newPassword) => {
        try {
            return await adminAuthService.resetPassword(email, code, newPassword);
        } catch (error) {
            throw error;
        }
    };

    // Return the provider - this is JSX but it's inside a React component
    // Since this is a .js file, we need to handle the JSX
    return React.createElement(
        AuthAdminContext.Provider,
        {
            value: {
                admin,
                token,
                isAuthenticated: !!token,
                loading,
                login,
                logout,
                updateProfile,
                forgotPassword,
                resetPassword
            }
        },
        !loading && children
    );
};

// Hook personnalisé pour utiliser le contexte facilement
export const useAuthAdmin = () => {
    const context = useContext(AuthAdminContext);
    if (!context) {
        throw new Error("useAuthAdmin doit être utilisé à l'intérieur de AuthAdminProvider");
    }
    return context;
};