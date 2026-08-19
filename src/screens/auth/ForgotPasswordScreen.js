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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Utilisation du hook d'authentification
  const { forgotPassword } = useAuth();

  // Validation de l'email
  const validateEmail = (text) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(text.trim());
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Vérifications de base
    if (!cleanEmail) {
      Alert.alert('Attention', 'Veuillez saisir votre adresse email.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert('Erreur', "Le format de l'email est invalide.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Appel à l'API via le context
      const result = await forgotPassword(cleanEmail);

      if (result.success) {
        // 3. Redirection DIRECTE vers ResetPassword, sans popup de confirmation
        navigation.navigate('ResetPassword', { email: cleanEmail });
      } else {
        Alert.alert('Erreur', result.message || 'Une erreur est survenue.');
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
            <Ionicons name="lock-open-outline" size={40} color="#2563EB" />
          </View>

          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            Entrez votre email pour recevoir un code de vérification par courriel.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Adresse Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Bouton d'action */}
            <Button
              title="Envoyer le code"
              onPress={handleSubmit}
              disabled={!email.trim() || isSubmitting}
              style={[
                styles.blueButton, 
                (!email.trim() || isSubmitting) && styles.disabledButton
              ]}
              textStyle={styles.buttonText}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Overlay de chargement */}
      {isSubmitting && <Loading overlay text="Envoi en cours..." />}
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