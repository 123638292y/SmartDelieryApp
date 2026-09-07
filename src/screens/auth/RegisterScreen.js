import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const InputField = memo(({ 
  label, 
  icon, 
  value, 
  onChangeText, 
  placeholder, 
  error, 
  secure = false, 
  toggleSecure, 
  keyboardType = "default",
  showPasswordToggle = false
}) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, error ? styles.inputError : null]}>
      <Ionicons name={icon} size={20} color={error ? "#EF4444" : "#94A3B8"} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        placeholderTextColor="#94A3B8"
      />
      {showPasswordToggle && toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} activeOpacity={0.7} style={styles.eyeIcon}>
          <Ionicons name={secure ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
));

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNo: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour le modal d'alerte
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnPress, setAlertOnPress] = useState(null);

  // Fonction pour afficher l'alerte avec un bouton OK
  const showAlert = (title, message, onPress = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnPress(() => onPress);
    setAlertVisible(true);
  };

  // Fonction pour fermer l'alerte
  const closeAlert = () => {
    setAlertVisible(false);
    if (alertOnPress) {
      alertOnPress();
      setAlertOnPress(null);
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    let sErrors = {};
    if (formData.firstName.trim().length < 2) sErrors.firstName = "Prénom trop court";
    if (formData.lastName.trim().length < 2) sErrors.lastName = "Nom trop court";
    if (!formData.idNo.trim()) sErrors.idNo = "Le matricule est requis";
    if (!formData.email.includes('@')) sErrors.email = "Email invalide";
    if (formData.phone.length < 8) sErrors.phone = "Téléphone invalide (min 8 chiffres)";
    if (formData.password.length < 6) sErrors.password = "Mot de passe trop court (min 6 caractères)";
    if (formData.password !== formData.confirmPassword) sErrors.confirmPassword = "Les mots de passe ne correspondent pas";

    setErrors(sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const result = await register(
        formData.firstName.trim(),
        formData.lastName.trim(),
        formData.email.trim().toLowerCase(),
        formData.phone.trim(),
        formData.password,
        formData.idNo.trim(),
        "MOBILE_APP"
      );

      if (result && result.success) {
        showAlert(
          "✅ Succès", 
          "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
          () => navigation.navigate('Login')
        );
      } else {
        const errorMsg = result?.message || "Échec de l'inscription";
        showAlert("⚠️ Attention", errorMsg);
      }
    } catch (err) {
      showAlert("❌ Erreur réseau", "Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={35} color="#10B981" />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Informations professionnelles requises</Text>
          </View>

          <View style={styles.form}>
            <InputField 
              label="Prénom" 
              icon="person-outline" 
              value={formData.firstName} 
              onChangeText={(val) => handleChange('firstName', val)} 
              placeholder="Youssef" 
              error={errors.firstName} 
            />

            <InputField 
              label="Nom" 
              icon="people-outline" 
              value={formData.lastName} 
              onChangeText={(val) => handleChange('lastName', val)} 
              placeholder="Mnafeg" 
              error={errors.lastName}
            />

            <InputField 
              label="N° Matricule" 
              icon="barcode-outline" 
              value={formData.idNo} 
              onChangeText={(val) => handleChange('idNo', val)} 
              placeholder="Ex: 28432853" 
              error={errors.idNo} 
            />

            <InputField 
              label="Email professionnel" 
              icon="mail-outline" 
              value={formData.email} 
              onChangeText={(val) => handleChange('email', val)} 
              placeholder="youssef@mail.com" 
              keyboardType="email-address" 
              error={errors.email} 
            />

            <InputField 
              label="Téléphone" 
              icon="call-outline" 
              value={formData.phone} 
              onChangeText={(val) => handleChange('phone', val)} 
              placeholder="216..." 
              keyboardType="phone-pad" 
              error={errors.phone} 
            />

            <InputField 
              label="Mot de passe" 
              icon="lock-closed-outline" 
              value={formData.password} 
              onChangeText={(val) => handleChange('password', val)} 
              placeholder="••••••••" 
              secure={!showPassword} 
              toggleSecure={() => setShowPassword(!showPassword)}
              showPasswordToggle={true}
              error={errors.password} 
            />

            <InputField 
              label="Confirmer le mot de passe" 
              icon="lock-closed-outline" 
              value={formData.confirmPassword} 
              onChangeText={(val) => handleChange('confirmPassword', val)} 
              placeholder="••••••••" 
              secure={!showConfirmPassword} 
              toggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
              showPasswordToggle={true}
              error={errors.confirmPassword} 
            />

            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.disabledButton]} 
              onPress={handleRegister} 
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.registerButtonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            style={styles.footerLink}
          >
            <Text style={styles.footerText}>
              Déjà inscrit ? <Text style={styles.footerTextBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal d'alerte personnalisé avec bouton OK */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={closeAlert}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{alertTitle}</Text>
            </View>
            <Text style={styles.modalMessage}>{alertMessage}</Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={closeAlert}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 25 },
  iconContainer: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  form: { width: '100%' },
  inputWrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginLeft: 2 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 54,
  },
  input: { flex: 1, marginLeft: 10, color: '#1E293B', fontSize: 15 },
  eyeIcon: { 
    padding: 8,
    marginLeft: 4,
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '500' },
  registerButton: {
    backgroundColor: '#10B981', height: 54, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3
  },
  disabledButton: { opacity: 0.6, backgroundColor: '#94A3B8' },
  registerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerLink: { marginTop: 25, marginBottom: 20, alignItems: 'center' },
  footerText: { color: '#64748B', fontSize: 14 },
  footerTextBold: { color: '#10B981', fontWeight: '800' },
  // Styles pour le Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginVertical: 12,
  },
  modalButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;