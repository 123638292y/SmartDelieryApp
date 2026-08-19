import { useNavigation } from '@react-navigation/native'; // Import pour la navigation
import {
  ChevronRight,
  History // Import de l'icône Historique
  ,
  LogOut,
  User,
  X
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function ProfilScreen() {
  const navigation = useNavigation(); // Initialisation du hook navigation
  const { driverData, userToken, logout, updateProfile } = useAuth();
  
  const [isOnline, setIsOnline] = useState(driverData?.is_online === 1);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    oldPassword: '',
    newPassword: ''
  });

  // Synchronisation initiale du formulaire avec les données du chauffeur
  useEffect(() => {
    if (driverData) {
      setFormData({
        first_name: driverData.first_name || '',
        last_name: driverData.last_name || '',
        email: driverData.email || '',
        phone: driverData.phone || '',
        oldPassword: '',
        newPassword: ''
      });
      setIsOnline(driverData.is_online === 1);
    }
  }, [driverData]);

  // Changement du statut de disponibilité
  const handleToggleOnline = async (value) => {
    const newStatus = value ? 1 : 0;
    try {
      setIsOnline(value); // Mise à jour visuelle immédiate (Optimistic UI)
      await authApi.updateOnlineStatus(driverData.id, newStatus, userToken);
    } catch (error) {
      if (error.message !== "Token invalide ou expiré") {
        setIsOnline(!value);
        Alert.alert("Erreur", "Impossible de mettre à jour votre statut.");
      }
    }
  };

  // Gestion de la déconnexion
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Déconnexion", 
        style: "destructive", 
        onPress: () => logout() 
      }
    ]);
  };

  // Mise à jour des informations du profil
  const handleUpdate = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone) {
      Alert.alert("Erreur", "Tous les champs obligatoires doivent être remplis");
      return;
    }

    setLoading(true);
    const result = await updateProfile({
      id_driver: driverData.id, 
      ...formData
    });
    setLoading(false);

    if (result.success) {
      Alert.alert("Succès", "Profil mis à jour !");
      setModalVisible(false);
    } else {
      if (result.message !== "Token invalide ou expiré") {
        Alert.alert("Erreur", result.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* EN-TÊTE DU PROFIL */}
        <View style={styles.header}>
          <View style={styles.userInitialCircle}>
            <Text style={styles.userInitialText}>
              {driverData?.first_name?.charAt(0)}{driverData?.last_name?.charAt(0)}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.textMuted }]} />
          </View>
          
          <Text style={styles.userName}>{driverData?.first_name} {driverData?.last_name}</Text>
          <Text style={styles.userEmail}>{driverData?.email}</Text>

          <View style={styles.onlineToggle}>
            <Text style={styles.onlineText}>{isOnline ? "En ligne" : "Hors ligne"}</Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isOnline ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* SECTION PARAMÈTRES */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paramètres du compte</Text>
          
          {/* Bouton Modifier profil */}
          <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
            <View style={styles.menuItemLeft}>
              <View style={styles.iconBox}>
                <User size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Modifier mes informations</Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* BOUTON HISTORIQUE DES LIVRAISONS */}
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('DriverHistory')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconBox}>
                <History size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Historique des livraisons</Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* BOUTON DÉCONNEXION */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={colors.danger} />
          <Text style={styles.logoutBtnText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE MISE À JOUR DU PROFIL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mise à jour du profil</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Prénom</Text>
              <TextInput 
                style={styles.input} 
                value={formData.first_name} 
                onChangeText={(t) => setFormData({...formData, first_name: t})} 
              />

              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput 
                style={styles.input} 
                value={formData.last_name} 
                onChangeText={(t) => setFormData({...formData, last_name: t})} 
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput 
                style={styles.input} 
                value={formData.email} 
                onChangeText={(t) => setFormData({...formData, email: t})} 
                keyboardType="email-address" 
                autoCapitalize="none" 
              />

              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput 
                style={styles.input} 
                value={formData.phone} 
                onChangeText={(t) => setFormData({...formData, phone: t})} 
                keyboardType="phone-pad" 
              />

              <View style={styles.divider} />
              <Text style={styles.passwordTitle}>Sécurité & Mot de passe</Text>
              
              <Text style={styles.inputLabel}>Ancien mot de passe</Text>
              <TextInput 
                style={styles.input} 
                secureTextEntry 
                placeholder="Requis pour changer le mot de passe" 
                onChangeText={(t) => setFormData({...formData, oldPassword: t})} 
              />
              
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <TextInput 
                style={styles.input} 
                secureTextEntry 
                placeholder="Laisser vide si inchangé" 
                onChangeText={(t) => setFormData({...formData, newPassword: t})} 
              />

              <Button 
                title="Valider les modifications" 
                onPress={handleUpdate} 
                style={{ marginTop: 20, marginBottom: 40 }} 
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* OVERLAY DE CHARGEMENT */}
      {loading && <Loading overlay text="Traitement en cours..." />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    alignItems: 'center', 
    paddingVertical: spacing.xl, 
    backgroundColor: colors.surface, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }
    })
  },
  userInitialCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: spacing.md, 
    position: 'relative' 
  },
  userInitialText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  statusDot: { 
    position: 'absolute', 
    bottom: 5, 
    right: 5, 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    borderWidth: 3, 
    borderColor: colors.surface 
  },
  userName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  onlineToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: spacing.lg, 
    backgroundColor: colors.background, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 25 
  },
  onlineText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginRight: 10 },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: colors.textMuted, 
    textTransform: 'uppercase', 
    marginBottom: spacing.sm, 
    marginLeft: 5 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: colors.surface, 
    padding: spacing.md, 
    borderRadius: 15, 
    marginBottom: spacing.sm,
    elevation: 1
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { 
    padding: 10, 
    borderRadius: 12, 
    marginRight: 15, 
    backgroundColor: colors.background 
  },
  menuItemText: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginHorizontal: spacing.lg, 
    marginTop: spacing.xl, 
    padding: spacing.md, 
    borderRadius: 15, 
    backgroundColor: colors.danger + '15' 
  },
  logoutBtnText: { color: colors.danger, fontWeight: '700', fontSize: 16, marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: colors.surface, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: spacing.lg, 
    maxHeight: '90%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.xl 
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 15 },
  input: { 
    backgroundColor: colors.background, 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    color: colors.textPrimary 
  },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 25 },
  passwordTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: 5 }
});