import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Remplacez par l'adresse IP de votre serveur (la même que dans Authapi.js)
const BASE_URL = 'http://192.168.1.103:5000/api';

export const useLivraisonsAujourdhui = () => {
  const { driverData, userToken } = useAuth();
  const [livraisons, setLivraisons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLivraisons = useCallback(async () => {
    // Si on n'a pas les infos du chauffeur ou le token, on ne fait rien
    if (!driverData?.id || !userToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Appel API : On récupère les livraisons assignées au chauffeur
      // L'URL /livraisons/today/:id_driver est un exemple, adaptez-la à votre backend
      const response = await axios.get(`${BASE_URL}/livraisons/today/${driverData.id}`, {
        headers: { 
          Authorization: `Bearer ${userToken}` 
        }
      });

      if (response.data.success) {
        setLivraisons(response.data.livraisons);
      } else {
        setError(response.data.message || "Erreur lors de la récupération");
      }
    } catch (err) {
      console.error("Erreur hook useLivraisonsAujourdhui:", err);
      setError("Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  }, [driverData?.id, userToken]);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchLivraisons();
  }, [fetchLivraisons]);

  return {
    livraisons,
    isLoading,
    error,
    refresh: fetchLivraisons // Permet de faire un "Pull to Refresh"
  };
};