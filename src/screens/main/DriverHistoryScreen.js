import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { livraisonApi } from '../../services/api';

const DriverHistoryScreen = ({ navigation }) => {
  const { driverData, userToken } = useAuth(); 
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!driverData?.identification_no || !userToken) return;

    try {
      setLoading(true);
      const response = await livraisonApi.getDriverHistory(driverData.identification_no, userToken);
      if (response.success) {
        setHistory(response.historique);
      }
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }) => {
    // Vérification du statut : 'C' pour Annulé, le reste (souvent 'T') pour Livré
    const isCanceled = item.status === 'C';
    
    return (
      <View style={[styles.card, isCanceled && styles.cardCanceled]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <MaterialCommunityIcons 
                name={isCanceled ? "close-circle-outline" : "file-document-outline"} 
                size={20} 
                color={isCanceled ? "#d32f2f" : "#666"} 
            />
            <Text style={[styles.docNo, isCanceled && styles.textStrike]}>
              {item.no_doc}
            </Text>
          </View>
          
          {/* Badge dynamique : Rouge pour Annulé, Vert pour Livré */}
          <View style={[
            styles.badge, 
            { backgroundColor: isCanceled ? '#FFEBEE' : '#E8F5E9' }
          ]}>
            <Text style={[
              styles.badgeText, 
              { color: isCanceled ? '#C62828' : '#2E7D32' }
            ]}>
              {isCanceled ? 'Annulé' : 'Livré'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.clientName, isCanceled && styles.textMuted]}>
            {item.nom_client}
          </Text>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons 
                name="map-marker" 
                size={16} 
                color={isCanceled ? "#bbb" : "#FF5252"} 
            />
            <Text style={[styles.infoText, isCanceled && styles.textMuted]}>
              {item.adresse_client}, {item.ville}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons 
                name={isCanceled ? "calendar-remove" : "calendar-check"} 
                size={16} 
                color={isCanceled ? "#bbb" : "#4CAF50"} 
            />
            <Text style={[styles.infoText, isCanceled && styles.textMuted]}>
              {isCanceled ? 'Annulé le ' : 'Livré le '} 
              {new Date(item.dat_delivery).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* On n'affiche le montant que si ce n'est pas annulé (ou on l'affiche grisé) */}
        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Total TTC :</Text>
          <Text style={[styles.totalAmount, isCanceled && styles.textMuted]}>
            {parseFloat(item.tot_ttc).toFixed(2)} €
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement de l'historique...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique des Livraisons</Text>
        <Text style={styles.headerSubtitle}>
            {history.length} opération{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Aucun historique disponible.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: {height: 2, width: 0} },
        android: { elevation: 2 }
    })
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1E293B' 
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: '#64748B', 
    marginTop: 5 
  },
  listContent: { 
    padding: 15,
    paddingBottom: 30
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  cardCanceled: {
    backgroundColor: '#FDFDFD',
    borderColor: '#FEE2E2',
    borderWidth: 1,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9', 
    paddingBottom: 8 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  docNo: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#475569', 
    marginLeft: 5 
  },
  textStrike: {
    textDecorationLine: 'line-through',
    color: '#94A3B8'
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20 
  },
  badgeText: { 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  cardBody: { 
    marginBottom: 10 
  },
  clientName: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 8 
  },
  textMuted: {
    color: '#94A3B8'
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 5 
  },
  infoText: { 
    fontSize: 14, 
    color: '#475569', 
    marginLeft: 8 
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'baseline', 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  totalLabel: { 
    fontSize: 13, 
    color: '#64748B', 
    marginRight: 8 
  },
  totalAmount: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#2563EB' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 100 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#94A3B8', 
    marginTop: 10 
  },
  loadingText: { 
    marginTop: 10, 
    color: '#64748B' 
  }
});

export default DriverHistoryScreen;