import * as Location from 'expo-location';
// Vérification des noms d'icônes Lucide
import {
  CheckCircle2,
  Clock,
  Gauge,
  Navigation,
  RefreshCw,
  Route, // Nom original
  Star,
  Store
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import MapView from '../../components/carte/MapView';
import { useAuth } from '../../contexts/AuthContext';
import { routeApi } from '../../services/api';
import { colors } from '../../theme/colors';
console.log("===== TEST MAP =====");
console.log("MapView:", MapView);
console.log("MapView typeof:", typeof MapView);

const MOISSY_COORDS = {
  latitude: 48.6224,
  longitude: 2.5932,
  label: "Urban Food Moissy"
};

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const ItineraireOptimiseScreen = ({ navigation }) => {
  const { userToken, driverData } = useAuth();
  const [data, setData] = useState(null);
  const [predictedSpeeds, setPredictedSpeeds] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [selectedPriorityId, setSelectedPriorityId] = useState(null);

  const hasLoadedOnce = useRef(false);

  const loadData = useCallback(async (priorityId = null) => {
    const matricule = driverData?.identification_no || driverData?.idNo;
    if (!matricule || !userToken) return;

    try {
      if (hasLoadedOnce.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const routeRes = await routeApi.getOptimizedRoute(
        matricule,
        userToken,
        MOISSY_COORDS.latitude,
        MOISSY_COORDS.longitude,
        priorityId
      );

      if (routeRes?.success) {
        setData(routeRes);
        if (priorityId) setSelectedPriorityId(priorityId);

        if (routeRes.predictedSpeeds) {
          setPredictedSpeeds(routeRes.predictedSpeeds);
        } else if (Array.isArray(routeRes.order)) {
          const speedsFromOrder = {};
          routeRes.order.forEach((item) => {
            if (item?.id && item.predicted_speed != null) {
              speedsFromOrder[item.id] = item.predicted_speed;
            }
          });
          setPredictedSpeeds(speedsFromOrder);
        }
      } else {
        Alert.alert("Information", routeRes?.message || "Aucune livraison active trouvée.");
      }
    } catch (error) {
      console.error("Erreur API:", error);
      Alert.alert("Erreur Serveur", "Le calcul d'itinéraire a échoué.");
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [driverData, userToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let locationSubscription = null;
    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !isMounted) return;

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 30 },
        (location) => {
          if (isMounted) {
            setLiveLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
          }
        }
      );
    })();

    return () => {
      isMounted = false;
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  const openExternalMap = (lat, lng, label) => {
    const latNum = toNum(lat);
    const lngNum = toNum(lng);
    if (latNum === null || lngNum === null) {
      Alert.alert("Erreur", "Coordonnées GPS invalides.");
      return;
    }
    const safeLabel = encodeURIComponent(label || "Destination");
    const url = Platform.select({
      ios: `maps:0,0?q=${safeLabel}@${latNum},${lngNum}`,
      android: `geo:0,0?q=${latNum},${lngNum}(${safeLabel})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`
    });
    Linking.openURL(url).catch(() => Alert.alert("Erreur", "Impossible d'ouvrir la navigation."));
  };

  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Optimisation en cours...</Text>
      </View>
    );
  }

  const stops = data?.order || [];
  const polylineRaw = data?.polyline || [];
  const clientsOnly = stops.filter(item => 
    item.id !== 'current_position' && item.id !== 'start_point' && item.id !== 'start'
  );
  const stats = data?.stats || { distance: "0 km", duration: "0 min" };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
            <View>
                <Text style={styles.title}>Itinéraire Smart</Text>
                <Text style={styles.subtitle}>Départ : Moissy (Fixe)</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setSelectedPriorityId(null); loadData(); }}
              style={styles.refreshBtn}
              disabled={isRefreshing}
            >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw size={20} color={colors.primary} />
                )}
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
            <Clock size={18} color={colors.primary}/>
            <Text style={styles.statVal}>{stats.duration}</Text>
        </View>
        <View style={[styles.stat, styles.border]}>
            {/* Utilisation sécurisée de l'icône Route */}
            <Route size={18} color={colors.primary}/>
            <Text style={styles.statVal}>{stats.distance}</Text>
        </View>
        <View style={styles.stat}>
            <CheckCircle2 size={18} color={colors.primary}/>
            <Text style={styles.statVal}>{clientsOnly.length} Colis</Text>
        </View>
      </View>

      <View style={styles.mapBox}>
        {/* Vérifiez que MapView n'est pas undefined ici avant le rendu */}
        {MapView ? (
            <MapView
                key={`map-${polylineRaw.length}-${selectedPriorityId}`}
                center={{ lat: MOISSY_COORDS.latitude, lng: MOISSY_COORDS.longitude }}
                markers={[
                    { lat: MOISSY_COORDS.latitude, lng: MOISSY_COORDS.longitude, title: "Départ Moissy", isStart: true },
                    ...(liveLocation ? [{ lat: liveLocation.latitude, lng: liveLocation.longitude, title: "Moi", isMe: true }] : []),
                    ...clientsOnly.map(s => ({
                        lat: toNum(s.latitude),
                        lng: toNum(s.longitude),
                        title: s.nom_client,
                        isMe: false,
                        isStart: false
                    }))
                ].filter(m => m.lat !== null && m.lng !== null)}
                polyline={polylineRaw.map(p => ({
                    lat: toNum(p.lat ?? p.latitude),
                    lng: toNum(p.lng ?? p.longitude)
                })).filter(p => p.lat !== null && p.lng !== null)}
            />
        ) : <View style={styles.center}><Text>Erreur de chargement de la carte</Text></View>}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.startInfo}>
            <Store size={16} color="#64748B" />
            <Text style={styles.startInfoText}>Urban Food Moissy-Cramayel</Text>
        </View>

        {clientsOnly.length === 0 ? (
          <Text style={styles.emptyText}>Aucun colis à livrer</Text>
        ) : (
          clientsOnly.map((item, index) => {
            const speed = predictedSpeeds[item.id] ?? item.predicted_speed ?? 35;
            const isNext = index === 0;
            const isSelected = selectedPriorityId === item.id;

            return (
              <View key={`item-${item.id}-${index}`} style={styles.item}>
                <View style={styles.left}>
                  <View style={[styles.dot, isNext ? styles.dotActive : styles.dotPending]}>
                    <Text style={styles.dotT}>{index + 1}</Text>
                  </View>
                  {index !== clientsOnly.length - 1 && <View style={styles.line} />}
                </View>

                <View style={[styles.card, isNext && styles.cardA, isSelected && styles.cardSelected]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.row}>
                      <Text style={styles.name} numberOfLines={1}>{item.nom_client}</Text>
                      {isNext && <Text style={styles.nextTag}>PROCHAIN</Text>}
                    </View>

                    <Text style={styles.addr} numberOfLines={1}>{item.adresse_client}</Text>

                    <TouchableOpacity
                        style={[styles.priorityBtn, isSelected && styles.priorityBtnActive]}
                        disabled={isRefreshing}
                        onPress={() => loadData(item.id)}
                    >
                        <Star
                            size={12}
                            color={isSelected ? "#FFF" : colors.primary}
                            fill={isSelected ? "#FFF" : "transparent"}
                        />
                        <Text style={[styles.priorityBtnText, isSelected && styles.priorityBtnTextActive]}>
                            {isSelected ? "Départ choisi" : "Commencer par ici"}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.speedBadge}>
                      <Gauge size={12} color={colors.primary} />
                      <Text style={styles.speedText}>Trafic IA: {Math.round(speed)} km/h</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.btnNav}
                    onPress={() => openExternalMap(item.latitude, item.longitude, item.nom_client)}
                  >
                    <Navigation color="#fff" size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ... gardez vos styles identiques ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B', fontWeight: '600' },
    header: { padding: 20, paddingBottom: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    refreshBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { fontSize: 13, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', marginHorizontal: 20, borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
    stat: { flex: 1, alignItems: 'center' },
    border: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E2E8F0' },
    statVal: { fontSize: 15, fontWeight: '800', marginTop: 4, color: '#1E293B' },
    mapBox: { height: 260, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    list: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
    startInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
    startInfoText: { fontSize: 12, color: '#475569', marginLeft: 8, fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontSize: 16 },
    item: { flexDirection: 'row', minHeight: 120 },
    left: { alignItems: 'center', width: 30, marginRight: 15 },
    dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    dotActive: { backgroundColor: colors.primary },
    dotPending: { backgroundColor: '#CBD5E1' },
    dotT: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    line: { flex: 1, width: 2, backgroundColor: '#F1F5F9', marginVertical: 4 },
    card: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    cardA: { backgroundColor: '#FFF', borderColor: colors.primary, borderWidth: 2, elevation: 2 },
    cardSelected: { borderColor: colors.primary, borderStyle: 'solid' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1 },
    nextTag: { fontSize: 9, color: '#FFF', backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontWeight: '800', marginLeft: 10 },
    addr: { fontSize: 12, color: '#64748B', marginTop: 3 },
    priorityBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
    priorityBtnActive: { backgroundColor: colors.primary },
    priorityBtnText: { fontSize: 10, color: colors.primary, fontWeight: '800', marginLeft: 5 },
    priorityBtnTextActive: { color: '#FFF' },
    speedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
    speedText: { fontSize: 11, color: '#64748B', fontWeight: '500', marginLeft: 5 },
    btnNav: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 12, elevation: 3 },
});

export default ItineraireOptimiseScreen;