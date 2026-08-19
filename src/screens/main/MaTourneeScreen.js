import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import MapView from '../../components/carte/MapView';
import LivraisonCard from '../../components/livraison/LivraisonCard';
import TourneeTimeline from '../../components/tournee/TourneeTimeline';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/ui/Loading';

import { useAuth } from '../../contexts/AuthContext';
import { livraisonApi } from '../../services/api';
import { colors } from '../../theme/colors';

const VUES = { LISTE: 'liste', CARTE: 'carte' };

// Coordonnées de base (Moissy)
const MOISSY_COORDS = { 
  lat: 48.6224, 
  lng: 2.5932 
};

// Helper de sécurité pour les nombres
const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export default function MaTourneeScreen({ navigation }) {
  const { driverData, userToken } = useAuth();
  const [vue, setVue] = useState(VUES.LISTE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [livraisons, setLivraisons] = useState([]);
  const [center, setCenter] = useState(MOISSY_COORDS);
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    try {
      const now = new Date();
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const formatted = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
      setTodayStr(formatted);
    } catch (e) {
      setTodayStr("Aujourd'hui");
    }
  }, []);

  const fetchTournee = useCallback(async (showLoading = true) => {
    const identificationNo = driverData?.identification_no || driverData?.idNo;
    if (!identificationNo || !userToken) {
      setIsLoading(false);
      return;
    }
    try {
      if(showLoading) setIsLoading(true);
      const response = await livraisonApi.getLivraisonsToday(identificationNo, userToken);
      
      if (response && response.success) {
        const dataReceived = response.livraisons || [];
        setLivraisons(dataReceived);
        
        // Ajuster le centre sur le premier client si possible
        if (dataReceived.length > 0) {
            const firstLat = toNum(dataReceived[0].latitude);
            const firstLng = toNum(dataReceived[0].longitude);
            if (firstLat && firstLng) {
                setCenter({ lat: firstLat, lng: firstLng });
            }
        }
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Erreur", "Impossible de charger la tournée.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [driverData, userToken]);

  useFocusEffect(
    useCallback(() => {
      fetchTournee();
    }, [fetchTournee])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTournee(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.title}>Ma tournée</Text>
            <Text style={styles.dateSubtitle}>{todayStr}</Text> 
          </View>
        </View>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, vue === VUES.LISTE && styles.toggleBtnActive]}
            onPress={() => setVue(VUES.LISTE)}
          >
            <Text style={[styles.toggleText, vue === VUES.LISTE && styles.toggleTextActive]}>Liste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, vue === VUES.CARTE && styles.toggleBtnActive]}
            onPress={() => setVue(VUES.CARTE)}
          >
            <Text style={[styles.toggleText, vue === VUES.CARTE && styles.toggleTextActive]}>Carte</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TourneeTimeline livraisons={livraisons} />

      <View style={styles.content}>
        {vue === VUES.LISTE ? (
          livraisons.length > 0 ? (
            <FlatList
              style={styles.list}
              data={livraisons}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              renderItem={({ item, index }) => (
                <LivraisonCard
                  ordre={index + 1}
                  livraison={{
                    ...item,
                    client: item.nom_client,
                    adresse: item.adresse_client,
                    status: item.status
                  }}
                  onPress={() => navigation.navigate('DetailLivraison', { id_doc: item.id })}
                />
              )}
            />
          ) : (
            <EmptyState 
              title="Aucune livraison" 
              description={isLoading ? "Chargement..." : "Aucune livraison pour aujourd'hui."} 
            />
          )
        ) : (
          <View style={styles.mapContainer}>
            <MapView 
              center={center}
              markers={[
                // 1. Toujours afficher le dépôt en vert
                { 
                  lat: MOISSY_COORDS.lat, 
                  lng: MOISSY_COORDS.lng, 
                  title: "Dépôt: Urban Food", 
                  isStart: true 
                },
                // 2. Afficher les clients
                ...livraisons.map((l, index) => ({
                  lat: toNum(l.latitude),
                  lng: toNum(l.longitude),
                  title: `${index + 1}. ${l.nom_client}`,
                  isMe: false,
                  isStart: false
                })).filter(m => m.lat !== null && m.lng !== null)
              ]}
            />
          </View>
        )}
      </View>

      {/* Bouton pour aller vers l'itinéraire optimisé */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('ItineraireOptimise')}
      >
        <Ionicons name="navigate" size={24} color="#FFF" />
        <Text style={styles.floatingButtonText}>Lancer le GPS</Text>
      </TouchableOpacity>

      {isLoading && <Loading overlay text="Chargement..." />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFF', 
    elevation: 4,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  dateSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  title: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  toggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 11, color: '#64748B' },
  toggleTextActive: { color: '#FFF', fontWeight: '600' },
  content: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  mapContainer: { flex: 1 },
  floatingButton: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    backgroundColor: colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15, 
    paddingHorizontal: 25, 
    borderRadius: 35, 
    elevation: 8, 
    zIndex: 999 
  },
  floatingButtonText: { color: '#FFF', fontWeight: 'bold', marginLeft: 10, fontSize: 16 }
});