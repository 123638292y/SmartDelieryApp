import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import de tes écrans
import AccueilLivreurScreen from '../screens/main/AccueilLivreurScreen';
import DetailLivraisonScreen from '../screens/main/DetailLivraisonScreen';
import ItineraireOptimiseScreen from '../screens/main/ItineraireOptimiseScreen';
import MaTourneeScreen from '../screens/main/MaTourneeScreen';
import NotificationScreen from '../screens/main/NotificationScreen';
import ProfilLivreurScreen from '../screens/main/ProfilLivreurScreen';
// --- AJOUT DE L'IMPORT ---
import DriverHistoryScreen from '../screens/main/DriverHistoryScreen';

// Thème
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * 1. Le TabNavigator (Seulement 3 onglets)
 */
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MaTournee') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary || '#2563EB',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9'
        },
        headerShown: false, 
      })}
    >
      <Tab.Screen 
        name="Accueil" 
        component={AccueilLivreurScreen} 
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="MaTournee" 
        component={MaTourneeScreen} 
        options={{ title: 'Ma Tournée' }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfilLivreurScreen} 
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

/**
 * 2. Le MainNavigator (Stack principal)
 */
const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: false,
        headerTintColor: colors.primary || '#2563EB',
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitleVisible: false,
      }}
    >
      {/* Contient les 3 onglets du bas */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* L'écran Notifications */}
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ 
          title: 'Mes Notifications',
          headerShown: true 
        }}
      />

      <Stack.Screen
        name="DetailLivraison"
        component={DetailLivraisonScreen}
        options={{ title: 'Détails Livraison' }}
      />

      <Stack.Screen
        name="ItineraireOptimise"
        component={ItineraireOptimiseScreen}
        options={{ title: 'Itinéraire' }}
      />

      {/* --- NOUVEL ÉCRAN AJOUTÉ ICI --- */}
      <Stack.Screen
        name="DriverHistory"
        component={DriverHistoryScreen}
        options={{ 
          title: 'Historique des Livraisons',
          headerShown: true 
        }}
      />
      
    </Stack.Navigator>
  );
};

export default MainNavigator;