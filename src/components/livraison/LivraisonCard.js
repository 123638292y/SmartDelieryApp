import {
    CheckCircle2,
    ChevronRight,
    Clock,
    MapPin,
    Package,
    Timer
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function LivraisonCard({ livraison, ordre, onPress }) {
  
  // Fonction pour gérer la couleur et le libellé du statut
  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case 'livré':
      case 'delivered':
        return { color: colors.success, bg: colors.success + '15', icon: CheckCircle2, label: 'Livré' };
      case 'en cours':
      case 'pending':
        return { color: colors.primary, bg: colors.primary + '15', icon: Timer, label: 'En cours' };
      default:
        return { color: colors.warning, bg: colors.warning + '15', icon: Package, label: 'À livrer' };
    }
  };

  const statusInfo = getStatusInfo(livraison.status);
  const StatusIcon = statusInfo.icon;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Badge de l'ordre de passage */}
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>{ordre}</Text>
      </View>

      <View style={styles.mainContent}>
        {/* En-tête : Nom du client et Statut */}
        <View style={styles.headerRow}>
          <Text style={styles.clientName} numberOfLines={1}>
            {livraison.nom_client || "Client Inconnu"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <StatusIcon size={12} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Adresse */}
        <View style={styles.infoRow}>
          <MapPin size={16} color={colors.textMuted} />
          <Text style={styles.infoText} numberOfLines={2}>
            {livraison.adresse_client || "Adresse non spécifiée"}
          </Text>
        </View>

        {/* Créneau horaire / Heure prévue */}
        <View style={styles.infoRow}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>
            {livraison.creneau_horaire || "Dès que possible"}
          </Text>
        </View>
      </View>

      {/* Flèche d'action */}
      <View style={styles.actionIcon}>
        <ChevronRight size={20} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Ombre pour Android
    elevation: 3,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  actionIcon: {
    marginLeft: spacing.sm,
  },
});