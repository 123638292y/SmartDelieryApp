import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function LoginScreen({ navigation }) {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [localError, setLocalError] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    const result = await login(email.trim(), password);
    if (!result.success) setLocalError(result.message);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background || '#F8F9FA' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Image style={styles.logo} source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4063/4063853.png' }} />
            <Text style={styles.title}>Espace livreur</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} secureTextEntry={secure} />
              <TouchableOpacity onPress={() => setSecure(!secure)}>
                <Text style={{ color: colors.primary }}>{secure ? 'Afficher' : 'Masquer'}</Text>
              </TouchableOpacity>
            </View>

            {localError && <Text style={styles.errorText}>{localError}</Text>}

            <Button title="Se connecter" onPress={handleLogin} disabled={authLoading} style={styles.loginButton} />

            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={{ textAlign: 'center', color: colors.primary }}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text>Nouveau livreur ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold' },
  form: { width: '100%' },
  label: { marginBottom: 5, fontWeight: '600' },
  input: { height: 50, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 15 },
  passwordInput: { flex: 1 },
  loginButton: { marginTop: 20, height: 50, borderRadius: 10 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 10 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 }
});