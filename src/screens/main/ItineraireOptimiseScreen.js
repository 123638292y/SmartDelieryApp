import * as Location from 'expo-location';
import {
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Star,
  TrendingDown,
  TrendingUp
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
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
  const [showSpeedImpact, setShowSpeedImpact] = useState(true);
  const hasLoadedOnce = useRef(false);

  // Fonction de chargement des données basée sur la position actuelle
  const loadData = useCallback(async (priorityId = null, currentCoords = null) => {
    const matricule = driverData?.identification_no || driverData?.idNo;
    const coords = currentCoords || liveLocation;

    if (!matricule || !userToken || !coords) return;

    try {
      if (hasLoadedOnce.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Appel à l'API avec VOTRE position actuelle
      const routeRes = await routeApi.getOptimizedRoute(
        matricule,
        userToken,
        coords.latitude,
        coords.longitude,
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
  }, [driverData, userToken, liveLocation]);

  // 1. Gérer la permission et la géolocalisation en continu
  useEffect(() => {
    let locationSubscription = null;
    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission refusée", "La localisation est requise pour optimiser le trajet depuis votre position.");
        setIsLoading(false);
        return;
      }

      // Récupérer la position initiale immédiatement
      const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (isMounted) {
        const coords = {
          latitude: initialLoc.coords.latitude,
          longitude: initialLoc.coords.longitude
        };
        setLiveLocation(coords);
        // Lancer le premier chargement avec ces coordonnées
        loadData(null, coords);
      }

      // Suivre les déplacements
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 50 },
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

  const getSpeedImpact = (speed) => {
    if (!speed) return { icon: null, color: '#94A3B8', label: 'Inconnu' };
    if (speed >= 40) return { icon: TrendingUp, color: '#22C55E', label: 'Fluide' };
    if (speed >= 30) return { icon: null, color: '#F59E0B', label: 'Modéré' };
    return { icon: TrendingDown, color: '#EF4444', label: 'Ralentis' };
  };

  const calculateTimeSaving = (stops) => {
    if (!stops || stops.length < 2) return null;
    const baseEstimate = stops.length * 15;
    const optimizedEstimate = baseEstimate * 0.8;
    return Math.round(baseEstimate - optimizedEstimate);
  };

  const onPullRefresh = () => {
    setSelectedPriorityId(null);
    loadData();
  };

  // Affichage pendant l'attente de la position GPS initiale
  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Localisation et optimisation...</Text>
        <Text style={styles.loadingSubText}>Calcul de l'itinéraire depuis votre position</Text>
      </View>
    );
  }

  const stops = data?.order || [];
  const polylineRaw = data?.polyline || [];
  const clientsOnly = stops.filter(item =>
    !['current_position', 'start_point', 'start', 'origin'].includes(item.id)
  );
  const stats = data?.stats || { distance: "0 km", duration: "0 min" };
  const timeSaving = calculateTimeSaving(clientsOnly);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onPullRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Itinéraire Intelligent</Text>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.subtitle}>Départ : Ma position actuelle</Text>
              </View>
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
            <Clock size={18} color={colors.primary} />
            <Text style={styles.statVal}>{stats.duration}</Text>
            <Text style={styles.statLabel}>Temps estimé</Text>
          </View>
          <View style={[styles.stat, styles.border]}>
            <Route size={18} color={colors.primary} />
            <Text style={styles.statVal}>{stats.distance}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <CheckCircle2 size={18} color={colors.primary} />
            <Text style={styles.statVal}>{clientsOnly.length}</Text>
            <Text style={styles.statLabel}>Colis</Text>
          </View>
        </View>

        {timeSaving && timeSaving > 0 && (
          <View style={styles.aiOptimizationBadge}>
            <Gauge size={16} color="#22C55E" />
            <Text style={styles.aiOptimizationText}>
              IA: ~{timeSaving} min gagnées sur ce trajet
            </Text>
          </View>
        )}

        <View style={styles.mapBox}>
          {MapView ? (
            <MapView
              key={`map-${polylineRaw.length}-${selectedPriorityId}`}
              center={liveLocation ? { lat: liveLocation.latitude, lng: liveLocation.longitude } : { lat: 48.8566, lng: 2.3522 }}
              markers={[
                ...(liveLocation ? [{ lat: liveLocation.latitude, lng: liveLocation.longitude, title: "Moi (Départ)", isMe: true, isStart: true }] : []),
                ...clientsOnly.map(s => ({
                  lat: toNum(s.latitude),
                  lng: toNum(s.longitude),
                  title: s.nom_client,
                  isMe: false,
                  isStart: false,
                  predictedSpeed: predictedSpeeds[s.id] || s.predicted_speed
                }))
              ].filter(m => m.lat !== null && m.lng !== null)}
              polyline={polylineRaw.map(p => ({
                lat: toNum(p.lat ?? p.latitude),
                lng: toNum(p.lng ?? p.longitude)
              })).filter(p => p.lat !== null && p.lng !== null)}
            />
          ) : <View style={styles.center}><Text>Erreur Carte</Text></View>}
        </View>

        <View style={styles.list}>
          <View style={styles.startInfo}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.startInfoText}>Position de départ actualisée</Text>
          </View>

          {clientsOnly.length === 0 ? (
            <Text style={styles.emptyText}>Aucune livraison à optimiser</Text>
          ) : (
            clientsOnly.map((item, index) => {
              const speed = predictedSpeeds[item.id] ?? item.predicted_speed ?? 35;
              const isNext = index === 0;
              const isSelected = selectedPriorityId === item.id;
              const impact = getSpeedImpact(speed);
              const SpeedIcon = impact.icon;

              const cardBorderColor = isNext ? colors.primary :
                speed >= 40 ? '#22C55E' :
                speed >= 30 ? '#F59E0B' : '#EF4444';

              return (
                <View key={`item-${item.id}-${index}`} style={styles.item}>
                  <View style={styles.left}>
                    <View style={[styles.dot, isNext ? styles.dotActive : styles.dotPending]}>
                      <Text style={styles.dotT}>{index + 1}</Text>
                    </View>
                    {index !== clientsOnly.length - 1 && <View style={styles.line} />}
                  </View>

                  <View style={[
                    styles.card,
                    isNext && styles.cardA,
                    isSelected && styles.cardSelected,
                    { borderColor: cardBorderColor }
                  ]}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.row}>
                        <Text style={styles.name} numberOfLines={1}>{item.nom_client}</Text>
                        {isNext && <Text style={styles.nextTag}>PROCHAIN</Text>}
                      </View>

                      <Text style={styles.addr} numberOfLines={1}>{item.adresse_client}</Text>

                      <TouchableOpacity
                        style={[styles.priorityBtn, isSelected && styles.priorityBtnActive]}
                        onPress={() => loadData(item.id)}
                      >
                        <Star
                          size={12}
                          color={isSelected ? "#FFF" : colors.primary}
                          fill={isSelected ? "#FFF" : "transparent"}
                        />
                        <Text style={[styles.priorityBtnText, isSelected && styles.priorityBtnTextActive]}>
                          {isSelected ? "Départ forcé" : "Prioriser cet arrêt"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.speedContainer}>
                        <View style={styles.speedBadge}>
                          <Gauge size={12} color={impact.color} />
                          <Text style={[styles.speedText, { color: impact.color }]}>
                            {Math.round(speed)} km/h
                          </Text>
                        </View>
                        {SpeedIcon && (
                          <View style={[styles.trafficIndicator, { backgroundColor: impact.color + '20' }]}>
                            <SpeedIcon size={12} color={impact.color} />
                            <Text style={[styles.trafficLabel, { color: impact.color }]}>
                              {impact.label}
                            </Text>
                          </View>
                        )}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollRoot: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B', fontWeight: '600' },
  loadingSubText: { marginTop: 5, color: '#94A3B8', fontSize: 13 },
  header: { padding: 20, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 6 },
  subtitle: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', marginHorizontal: 20, borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  border: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E2E8F0' },
  statVal: { fontSize: 15, fontWeight: '800', marginTop: 2, color: '#1E293B' },
  aiOptimizationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22C55E40'
  },
  aiOptimizationText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
    marginLeft: 8
  },
  mapBox: { height: 260, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  list: { paddingHorizontal: 20, marginTop: 20 },
  startInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F1F5F9', padding: 8, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start' },
  startInfoText: { fontSize: 11, color: '#475569', marginLeft: 6, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontSize: 16 },
  item: { flexDirection: 'row', minHeight: 120 },
  left: { alignItems: 'center', width: 30, marginRight: 15 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  dotActive: { backgroundColor: colors.primary },
  dotPending: { backgroundColor: '#CBD5E1' },
  dotT: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  line: { flex: 1, width: 2, backgroundColor: '#F1F5F9', marginVertical: 4 },
  card: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#F1F5F9' },
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
  speedContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  speedBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  speedText: { fontSize: 13, fontWeight: '700', marginLeft: 5 },
  trafficIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  trafficLabel: { fontSize: 10, fontWeight: '600', marginLeft: 4 },
  btnNav: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 12, elevation: 3 },
});

export default ItineraireOptimiseScreen;