import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

// Import de ton store Redux et de ton AuthContext
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { store } from '../store';

// Import des Navigators (à créer selon tes fichiers)
import AuthNavigator from '../navigation/AuthNavigator';
import MainNavigator from '../navigation/MainNavigator'; // Contient Profil, Home, etc.

import Loading from '../components/ui/Loading';
import { colors } from '../theme/colors';

/**
 * 
 * Ce composant interne gère la logique de switch entre 
 * les écrans de connexion et l'application principale.
 */
const RootNavigator = () => {
  const { userToken, isLoading } = useAuth();

  // Pendant que l'app vérifie le token dans AsyncStorage
  if (isLoading) {
    return <Loading overlay text="Chargement..." />;
  }

  return (
    <NavigationContainer>
      {userToken ? (
        // Si le token existe, on affiche l'app principale (Home, Profil, etc.)
        <MainNavigator />
      ) : (
        // Sinon, on affiche les écrans de connexion (Login, ForgotPassword)
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SafeAreaProvider>
          {/* Configuration de la barre d'état du téléphone */}
          <StatusBar 
            barStyle="dark-content" 
            backgroundColor={colors.background} 
          />
          
          {/* Navigation Racine */}
          <RootNavigator />
          
        </SafeAreaProvider>
      </AuthProvider>
    </Provider>
  );
}