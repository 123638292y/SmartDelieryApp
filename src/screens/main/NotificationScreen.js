import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { notificationApi } from '../../services/api'; // Utilisation du nouveau service
import { colors } from '../../theme/colors';

const SOCKET_URL = "http://192.168.1.103:5000"; 

export default function NotificationScreen() {
  const { driverData, userToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- 1. CHARGEMENT DE L'HISTORIQUE ---
  const fetchNotifications = useCallback(async () => {
    if (!driverData?.id) return;
    try {
      setIsRefreshing(true);
      const res = await notificationApi.getNotifications(driverData.id, userToken);
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (error) {
      console.error("Erreur fetch notifications:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [driverData?.id, userToken]);

  // --- 2. RÉCEPTION TEMPS RÉEL (SOCKET) ---
  useEffect(() => {
    if (!driverData?.id) return;

    const socket = io(SOCKET_URL);
    socket.emit('join', driverData.id);

    socket.on('notification', (data) => {
      // On ajoute la notification reçue en haut de liste
      const newNotif = {
        id: data.id || Date.now().toString(),
        title: data.title,
        message: data.message,
        created_at: data.created_at || new Date().toISOString(),
        is_read: 0,
        type: data.type || 'delivery'
      };
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => socket.disconnect();
  }, [driverData?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // --- 3. ACTIONS ---

  // Marquer une notification comme lue
  const handleMarkAsRead = async (id, isAlreadyRead) => {
    if (isAlreadyRead) return;

    try {
      // Mise à jour locale immédiate (Optimistic UI)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
      // Appel API
      await notificationApi.markAsRead(id, userToken);
    } catch (error) {
      console.error("Erreur markAsRead:", error);
    }
  };

  // Marquer TOUT comme lu
  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      await notificationApi.markAllAsRead(driverData.id, userToken);
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
    }
  };

  // Supprimer une notification
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
        onLongPress={() => handleDelete(item.id)} // Appui long pour supprimer
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
            <Text style={[styles.notifTitle, !isRead && styles.unreadText]}>
              {item.title}
            </Text>
            {!isRead && <View style={styles.dot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>

        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color="#CBD5E1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER AVEC BOUTON TOUT MARQUER COMME LU */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Gérez vos alertes de livraison</Text>
        </View>
        
        {notifications.some(n => n.is_read === 0) && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={fetchNotifications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={50} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>Aucune notification</Text>
            <Text style={styles.emptySubtext}>Vous recevrez une alerte ici lorsqu'un colis vous sera attribué.</Text>
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
      paddingTop: 60, 
      paddingBottom: 20, 
      backgroundColor: '#FFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9'
    },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    readAllBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
    readAllText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
    
    listContent: { padding: 16, paddingBottom: 40 },
    card: {
      flexDirection: 'row',
      backgroundColor: '#FFF',
      padding: 16,
      borderRadius: 20,
      marginBottom: 12,
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    unreadCard: {
      backgroundColor: '#F0FDF4', // Vert très léger pour le non lu
      borderLeftWidth: 4,
      borderLeftColor: colors.primary || '#10B981',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16
    },
    textContainer: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notifTitle: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    unreadText: { color: '#1E293B', fontWeight: '700' },
    message: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
    time: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary || '#10B981' },
    deleteBtn: { padding: 5, marginLeft: 5 },

    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#475569' },
    emptySubtext: { textAlign: 'center', color: '#94A3B8', marginTop: 8, lineHeight: 20 }
});