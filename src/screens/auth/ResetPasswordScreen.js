import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Import de vos composants personnalisés
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordScreen({ navigation, route }) {
  // Email reçu en paramètre depuis ForgotPasswordScreen
  const { email } = route.params || {};

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async () => {
    // 1. Vérifications de base
    if (!code.trim()) {
      Alert.alert('Attention', 'Veuillez saisir le code reçu par email.');
      return;
    }

    if (code.trim().length !== 6) {
      Alert.alert('Erreur', 'Le code doit contenir 6 chiffres.');
      return;
    }

    if (!newPassword) {
      Alert.alert('Attention', 'Veuillez saisir un nouveau mot de passe.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Appel à l'API via le context
      const result = await resetPassword(email, code.trim(), newPassword);

      if (result.success) {
        Alert.alert(
          'Succès',
          'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Retour à l'écran de connexion
                navigation.navigate('Login');
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Code invalide ou expiré.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Bouton Retour */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Icône décorative */}
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={40} color="#2563EB" />
          </View>

          <Text style={styles.title}>Réinitialisation</Text>
          <Text style={styles.subtitle}>
            Entrez le code reçu à{' '}
            <Text style={styles.emailHighlight}>{email}</Text> ainsi que votre nouveau mot de
            passe.
          </Text>

          <View style={styles.form}>
            {/* Code de vérification */}
            <Text style={styles.label}>Code de vérification</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
            </View>

            {/* Nouveau mot de passe */}
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            {/* Confirmation du mot de passe */}
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Bouton d'action */}
            <Button
              title="Réinitialiser le mot de passe"
              onPress={handleSubmit}
              disabled={!code.trim() || !newPassword || !confirmPassword || isSubmitting}
              style={[
                styles.blueButton,
                (!code.trim() || !newPassword || !confirmPassword || isSubmitting) &&
                  styles.disabledButton,
              ]}
              textStyle={styles.buttonText}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Overlay de chargement */}
      {isSubmitting && <Loading overlay text="Réinitialisation en cours..." />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backText: {
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 8,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#1E293B',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 10,
  },
  blueButton: {
    backgroundColor: '#2563EB',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});