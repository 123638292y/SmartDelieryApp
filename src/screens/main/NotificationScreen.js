import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { notificationApi } from '../../services/api';
import { colors } from '../../theme/colors';

// REMPLACER PAR VOTRE ADRESSE IP LOCALE (PC)
const SOCKET_URL = "http://192.168.20.141:5000"; 

export default function NotificationScreen() {
  const { driverData, userToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- FONCTION DE FORMATAGE DE DATE (Correction pour éviter le crash Android) ---
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month} à ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

 const fetchNotifications = useCallback(async () => {
  if (!driverData?.id) return;
  try {
    setIsRefreshing(true);
    const res = await notificationApi.getNotifications(driverData.id, userToken);
    
    console.log("Nombre de notifs reçues par l'app:", res.notifications.length);

    if (res && res.success) {
      // On remplace TOUTE la liste par les données fraîches de la DB
      setNotifications(res.notifications); 
    }
  } catch (error) {
    console.error(error);
  } finally {
    setIsRefreshing(false);
  }
}, [driverData?.id, userToken]);

  // --- 2. RÉCEPTION TEMPS RÉEL (SOCKET.IO) ---
  useEffect(() => {
    if (!driverData?.id) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    socket.on('connect', () => {
      console.log("✅ Socket Connecté!");
      socket.emit('join', driverData.id);
    });

    socket.on('notification', (data) => {
      console.log("📩 Nouvelle notification reçue par socket:", data);
      
      const newNotif = {
        id: data?.id || Date.now().toString(), // Utilise l'ID envoyé par le backend
        title: data?.title || "Nouvelle alerte",
        message: data?.message || "",
        created_at: data?.created_at || new Date().toISOString(),
        is_read: 0,
        type: data?.type || 'delivery'
      };

      setNotifications(prev => {
        const currentList = Array.isArray(prev) ? prev : [];
        // Empêcher les doublons si l'ID existe déjà (important pour le refresh)
        if (currentList.find(n => n.id === newNotif.id)) return currentList;
        return [newNotif, ...currentList];
      });
    });

    socket.on('connect_error', (err) => {
      console.error("❌ Erreur de connexion Socket:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [driverData?.id]);

  // Charger au montage
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // --- 3. ACTIONS ---

  const handleMarkAsRead = async (id, isAlreadyRead) => {
    if (isAlreadyRead) return;
    try {
      // Mise à jour visuelle immédiate
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
      await notificationApi.markAsRead(id, userToken);
    } catch (error) {
      console.error("Erreur markAsRead:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!notifications || notifications.length === 0) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      await notificationApi.markAllAsRead(driverData.id, userToken);
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Supprimer",
      "Voulez-vous supprimer cette notification ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            try {
              setNotifications(prev => prev.filter(n => n.id !== id));
              await notificationApi.deleteNotification(id, userToken);
            } catch (error) {
              console.error("Erreur deleteNotification:", error);
            }
          } 
        }
      ]
    );
  };

  // --- RENDU ---

  const renderItem = ({ item }) => {
    const isRead = item.is_read === 1 || item.is_read === true;

    return (
      <TouchableOpacity 
        style={[styles.card, !isRead && styles.unreadCard]} 
        onPress={() => handleMarkAsRead(item.id, isRead)}
        onLongPress={() => handleDelete(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: isRead ? '#F1F5F9' : '#DBEAFE' }]}>
          <Ionicons 
            name={item.type === 'delivery' ? 'cube' : 'notifications'} 
            size={22} 
            color={isRead ? '#94A3B8' : colors.primary} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.notifTitle, !isRead && styles.unreadText]} numberOfLines={1}>
              {item.title}
            </Text>
            {!isRead && <View style={styles.dot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{formatDate(item.created_at)}</Text>
        </View>

        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color="#CBD5E1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Vos alertes de livraison</Text>
        </View>
        
        {Array.isArray(notifications) && notifications.some(n => n.is_read === 0) && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={fetchNotifications} 
            tintColor={colors.primary} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={50} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>Aucune notification</Text>
            <Text style={styles.emptySubtext}>Les nouvelles missions apparaîtront ici.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { 
      paddingHorizontal: 20, 
      paddingTop: Platform.OS === 'ios' ? 60 : 40, 
      paddingBottom: 20, 
      backgroundColor: '#FFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9'
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { fontSize: 13, color: '#64748B' },
    readAllBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
    readAllText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
    
    listContent: { padding: 16 },
    card: {
      flexDirection: 'row',
      backgroundColor: '#FFF',
      padding: 15,
      borderRadius: 16,
      marginBottom: 12,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 5,
    },
    unreadCard: {
      backgroundColor: '#F0FDF4', 
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    textContainer: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notifTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', flex: 1 },
    unreadText: { color: '#1E293B', fontWeight: '700' },
    message: { fontSize: 13, color: '#64748B', marginTop: 3 },
    time: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
    deleteBtn: { padding: 5, marginLeft: 5 },

    emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: '#475569' },
    emptySubtext: { textAlign: 'center', color: '#94A3B8', marginTop: 5 }
});