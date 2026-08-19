import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import Loading from '../../components/ui/Loading';

import { useAuth } from '../../contexts/AuthContext';
import { livraisonApi } from '../../services/api';

// ==========================================
// COMPOSANT MODAL DE QUANTITÉ (INTERNE)
// ==========================================
function QuantityModal({ visible, onClose, onSave, item }) {
  const [quantity, setQuantity] = useState('0');

  useEffect(() => {
    if (item) setQuantity(Math.round(item.qte).toString()); // Affichage entier
  }, [item, visible]);

  const adjustQty = (val) => {
    const current = parseInt(quantity || 0); // Utilisation de parseInt pour rester en entier
    const next = Math.max(0, current + val);
    setQuantity(next.toString());
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
                <Ionicons name="create" size={24} color="#3B82F6" />
                <Text style={styles.modalTitle}>Modifier la quantité</Text>
            </View>
            
            <Text style={styles.modalItemName}>{item?.lib_art || item?.ref_prd}</Text>

            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(-1)}>
                <Ionicons name="remove" size={24} color="#1E293B" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))} // Autorise uniquement les chiffres
                selectTextOnFocus
              />

              <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(1)}>
                <Ionicons name="add" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnAction, styles.btnCancel]} onPress={onClose}>
                <Text style={styles.textCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnAction, styles.btnConfirm]} 
                onPress={() => onSave(parseInt(quantity || 0))}
              >
                <Text style={styles.textConfirm}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ==========================================
// ÉCRAN PRINCIPAL
// ==========================================
const STATUS_LABELS = { O: 'En cours', T: 'Livrée', C: 'Annulée' };
const STATUS_COLORS = { O: '#3B82F6', T: '#10B981', C: '#EF4444' };

const formatAmount = (value) => {
  const num = Number(value);
  return isNaN(num) ? '0.00 €' : num.toFixed(2) + ' €'; // Passage en Euro
};

export default function DetailLivraisonScreen({ route, navigation }) {
  const { id_doc } = route.params;
  const { userToken } = useAuth();

  const [delivery, setDelivery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [selectedLine, setSelectedLine] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const data = await livraisonApi.getLivraisonDetail(id_doc, userToken);
      if (data.success) {
        setDelivery(data.livraison);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les détails.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id_doc]);

  const handleUpdateStatus = async (newStatus) => {
    const label = newStatus === 'T' ? 'confirmer' : 'annuler';
    Alert.alert(
      "Confirmation",
      `Voulez-vous vraiment ${label} cette livraison ?`,
      [
        { text: "Non" },
        { text: "Oui", onPress: async () => {
            try {
              setIsUpdating(true);
              const response = await livraisonApi.updateLivraisonStatus(id_doc, newStatus, userToken);
              if (response.success) {
                fetchDetail(); 
              }
            } catch (error) {
              Alert.alert("Erreur", "Mise à jour impossible.");
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveQuantity = async (newQte) => {
    try {
      setModalVisible(false);
      setIsUpdating(true);
      const res = await livraisonApi.updateDetailQuantity(selectedLine.id, newQte, userToken);
      if (res.success) {
        fetchDetail(); 
      }
    } catch (e) {
      Alert.alert("Erreur", "La modification a échoué.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <Loading text="Chargement..." />;
  if (!delivery) return <View style={styles.center}><Text>Livraison introuvable.</Text></View>;

  const currentStatus = delivery.status || 'O';
  const isFinished = currentStatus === 'T' || currentStatus === 'C';
  const lines = Array.isArray(delivery.details) ? delivery.details : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.reference}>#{delivery.no_doc || delivery.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[currentStatus] || '#64748B' }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[currentStatus] || 'Inconnu'}</Text>
          </View>
        </View>

        {/* CLIENT CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={16} color="#64748B" />
            <Text style={styles.sectionTitle}>Client</Text>
          </View>
          <Text style={styles.value}>{delivery.client_name || 'Client sans nom'}</Text>
          {delivery.client_phone && (
            <TouchableOpacity style={styles.phoneContainer} onPress={() => Linking.openURL(`tel:${delivery.client_phone}`)}>
              <Ionicons name="call" size={18} color="#2563EB" />
              <Text style={styles.link}>{delivery.client_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ADDRESS CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color="#64748B" />
            <Text style={styles.sectionTitle}>Adresse</Text>
          </View>
          <Text style={styles.value}>{delivery.client_address}{delivery.ville ? `,\n${delivery.ville}` : ''}</Text>
        </View>

        {/* ARTICLES CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={16} color="#64748B" />
            <Text style={styles.sectionTitle}>Articles ({lines.length})</Text>
          </View>
          
          {lines.map((line, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.lineRow, isFinished && { borderLeftWidth: 0 }]}
              onPress={() => {
                if (!isFinished) {
                  setSelectedLine(line);
                  setModalVisible(true);
                }
              }}
              disabled={isFinished}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.lineLabel}>{line.lib_art || line.ref_prd}</Text>
                <Text style={styles.lineSub}>
                    Qté: <Text style={{fontWeight: 'bold', color: '#1E293B'}}>{Math.round(line.qte)}</Text> {line.unite}
                </Text>
              </View>
              <View style={styles.priceAndEdit}>
                <Text style={styles.linePrice}>{formatAmount(line.tot_ht_rem || (line.qte * line.prix_u_ht))}</Text>
                {!isFinished && (
                    <Ionicons name="create-outline" size={20} color="#3B82F6" style={{marginLeft: 10}} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {delivery.total_qte_doc > 0 && (
              <View style={styles.totalQtyRow}>
                  <Text style={styles.totalQtyText}>Total Unités : {Math.round(delivery.total_qte_doc)}</Text>
              </View>
          )}
        </View>

        {/* TOTAL TTC CARD */}
        <View style={[styles.card, { backgroundColor: '#F0FDFA', borderColor: '#10B981', borderLightWidth: 1 }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.totalLabel, { color: '#065F46' }]}>Total TTC à collecter</Text>
            <Text style={styles.totalValue}>{formatAmount(delivery.tot_ttc)}</Text>
          </View>
        </View>

        {/* ACTIONS */}
        {!isFinished && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: STATUS_COLORS.T }]}
                onPress={() => handleUpdateStatus('T')}
            >
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.mainButtonText}>Confirmer la livraison</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleUpdateStatus('C')} style={styles.cancelButton}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Annuler la livraison</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <QuantityModal 
        visible={modalVisible}
        item={selectedLine}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveQuantity}
      />

      {isUpdating && <Loading overlay text="Mise à jour..." />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reference: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, color: '#334155', fontWeight: '500' },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  link: { fontSize: 16, color: '#2563EB', fontWeight: '700' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  lineLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  lineSub: { fontSize: 13, color: '#64748B' },
  priceAndEdit: { flexDirection: 'row', alignItems: 'center' },
  linePrice: { fontSize: 15, fontWeight: '700', color: '#334155' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalValue: { fontWeight: '900', color: '#059669', fontSize: 22 },
  totalQtyRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  totalQtyText: { textAlign: 'right', fontWeight: '700', color: '#64748B', fontSize: 12 },
  actionsContainer: { marginTop: 10, gap: 12, paddingBottom: 40 },
  mainButton: { height: 60, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  mainButtonText: { color: 'white', fontWeight: '800', fontSize: 16 },
  cancelButton: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#FED7D7', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  cancelButtonText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalContainer: { width: '100%' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  modalItemName: { fontSize: 15, color: '#64748B', marginBottom: 25, backgroundColor: '#F8F9FA', padding: 10, borderRadius: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  qtyBtn: { width: 55, height: 55, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 100, textAlign: 'center', fontSize: 32, fontWeight: '900', color: '#3B82F6', marginHorizontal: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnAction: { flex: 1, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnCancel: { backgroundColor: '#F1F5F9' },
  btnConfirm: { backgroundColor: '#3B82F6' },
  textCancel: { color: '#64748B', fontWeight: '800', fontSize: 15 },
  textConfirm: { color: 'white', fontWeight: '800', fontSize: 15 }
});