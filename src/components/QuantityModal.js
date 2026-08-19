import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function QuantityModal({ visible, onClose, onSave, item }) {
  const [quantity, setQuantity] = useState('0');

  // Synchroniser la quantité quand le modal s'ouvre
  useEffect(() => {
    if (item) setQuantity(item.qte.toString());
  }, [item, visible]);

  const handleIncrement = () => {
    const val = parseFloat(quantity) || 0;
    setQuantity((val + 1).toString());
  };

  const handleDecrement = () => {
    const val = parseFloat(quantity) || 0;
    if (val > 0) setQuantity((val - 1).toString());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Modifier Quantité</Text>
            <Text style={styles.itemName}>{item?.lib_art || item?.ref_prd}</Text>

            <View style={styles.row}>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrement}>
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                selectTextOnFocus
              />

              <TouchableOpacity style={styles.qtyBtn} onPress={handleIncrement}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btn, styles.saveBtn]} 
                onPress={() => onSave(parseFloat(quantity))}
              >
                <Text style={styles.saveText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', maxWidth: 400 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  title: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  itemName: { fontSize: 14, color: '#64748B', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  qtyBtn: { width: 50, height: 50, backgroundColor: '#F1F5F9', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  input: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: '#10B981', marginHorizontal: 15 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  saveBtn: { backgroundColor: '#10B981' },
  cancelText: { color: '#64748B', fontWeight: '700' },
  saveText: { color: 'white', fontWeight: '700' }
});