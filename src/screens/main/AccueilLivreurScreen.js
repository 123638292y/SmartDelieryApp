import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import io from 'socket.io-client'; // 1. استيراد مكتبة الـ Socket

import { useAuth } from '../../contexts/AuthContext';
import { livraisonApi, notificationApi } from '../../services/api';
import { colors } from '../../theme/colors';

// استبدل هذا بالـ IP الخاص بسيرفرك
const SOCKET_URL = "http://192.168.20.141:5000"; 

export default function AccueilLivreurScreen({ navigation }) {
  const { driverData, userToken } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    delivered: 0,
    remaining: 0,
    total: 0
  });

useEffect(() => {
  if (!driverData?.id) return;

  const socket = io(SOCKET_URL, {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log("✅ Accueil: Socket connecté");
    // On envoie l'ID comme une chaîne de caractères
    socket.emit('join', String(driverData.id)); 
  });

  socket.on('notification', (data) => {
    console.log("📩 Nouveau message reçu, mise à jour du badge");
    // On incrémente le badge en temps réel
    setUnreadCount(prev => prev + 1);
  });

  return () => socket.disconnect();
}, [driverData?.id]);

const fetchStats = useCallback(async () => {
    const matricule = driverData?.identification_no || driverData?.idNo;

    if (!matricule || !userToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await livraisonApi.getDeliveryStats(matricule, userToken);
      if (res.success && res.stats) {
        setStats({
          delivered: Number(res.stats.delivered) || 0,
          remaining: Number(res.stats.remaining) || 0,
          total: Number(res.stats.total) || 0
        });
      }
    } catch (error) {
      console.error("Erreur stats front:", error);
    } finally {
      setIsLoading(false);
    }
  }, [driverData, userToken]);

const fetchUnreadCount = useCallback(async () => {
  const driverId = driverData?.id; 
  console.log("🔍 Tentative fetchUnreadCount pour ID:", driverId); // LOG 1

  if (!driverId || !userToken) {
    console.log("⚠️ ID ou Token manquant dans Accueil");
    return;
  }

  try {
    const res = await notificationApi.getUnreadCount(driverId, userToken);
    console.log("📡 Réponse API UnreadCount:", res); // LOG 2

    if (res.success) {
      setUnreadCount(res.count);
    }
  } catch (error) {
    console.error("❌ Erreur API unread count:", error);
  }
}, [driverData, userToken]);

  // تحديث البيانات كلما عادت الشاشة للتركيز (Focus)
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchUnreadCount();
    }, [fetchStats, fetchUnreadCount])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{driverData?.first_name || 'Livreur'} 👋</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.notificationBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={26} color="#1E293B" />
          
          {/* BADGE الإشعارات */}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* STATS CARDS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.iconCircleGreen}>
              <Ionicons name="checkmark-done" size={22} color="#10B981" />
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#10B981" style={styles.loader} />
            ) : (
              <Text style={styles.statValue}>{stats.delivered}</Text>
            )}
            <Text style={styles.statLabel}>Livrés</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.iconCircleOrange}>
              <Ionicons name="alert-circle" size={22} color="#F59E0B" />
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#F59E0B" style={styles.loader} />
            ) : (
              <Text style={styles.statValue}>{stats.remaining}</Text>
            )}
            <Text style={styles.statLabel}>Restants</Text>
          </View>
        </View>

        {/* MAIN ACTION CARD */}
        <TouchableOpacity 
          style={styles.mainCard} 
          onPress={() => navigation.navigate('MaTournee')}
          activeOpacity={0.85}
        >
          <View style={styles.mainCardContent}>
            <Text style={styles.mainCardTitle}>Ma Tournée</Text>
            <Text style={styles.mainCardSubtitle}>
              {stats.total > 0 
                ? `${stats.total} livraisons prévues pour aujourd'hui` 
                : "Aucune livraison assignée pour le moment"}
            </Text>
            
            <View style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Voir la liste</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFF" />
            </View>
          </View>
          
          {/* خلفية جمالية للكارت */}
          <Ionicons name="navigate-circle" size={100} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  greeting: { fontSize: 14, color: '#64748B' },
  userName: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: {
    backgroundColor: '#FFF',
    width: '48%',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  iconCircleGreen: { backgroundColor: '#DCFCE7', padding: 8, borderRadius: 12 },
  iconCircleOrange: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 12 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginTop: 12 },
  statLabel: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '500' },
  loader: { marginTop: 12 },
  mainCard: {
    backgroundColor: colors.primary || '#2563EB',
    borderRadius: 28,
    padding: 25,
    height: 190,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mainCardContent: { flex: 1, justifyContent: 'center' },
  mainCardTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  mainCardSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6, marginBottom: 25 },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', marginRight: 10 },
  bgIcon: { position: 'absolute', right: -15, bottom: -15 },
});