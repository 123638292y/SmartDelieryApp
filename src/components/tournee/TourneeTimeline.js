import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width } = Dimensions.get('window');

export default function TourneeTimeline({ livraisons = [] }) {
  // حماية إضافية: التأكد من أن livraisons مصفوفة دائماً
  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  // حساب الإحصائيات بناءً على رموز الحالة في قاعدة البيانات (L = Livré, E = En cours/En attente)
  const total = safeLivraisons.length;
  
  const livrés = safeLivraisons.filter(l => 
    l.status === 'L' || 
    l.status?.toLowerCase() === 'livré' || 
    l.status?.toLowerCase() === 'delivered'
  ).length;

  const enCours = safeLivraisons.filter(l => 
    l.status === 'E' || 
    l.status === 'P' ||
    l.status?.toLowerCase() === 'en cours' || 
    l.status?.toLowerCase() === 'pending'
  ).length;
  
  // حساب النسبة المئوية
  const progression = total > 0 ? (livrés / total) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Ligne de texte d'infos */}
      <View style={styles.infoRow}>
        <View style={styles.statGroup}>
          <Text style={styles.statValue}>{livrés}/{total}</Text>
          <Text style={styles.statLabel}>Livraisons effectuées</Text>
        </View>
        <Text style={styles.percentageText}>{Math.round(progression)}%</Text>
      </View>

      {/* Conteneur de la barre de progression */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progression}%` }]} />
      </View>

      {/* Liste des badges d'état */}
      <View style={styles.badgesRow}>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: colors.success || '#10B981' }]} />
          <Text style={styles.badgeText}>{livrés} Livrés</Text>
        </View>
        
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: colors.primary || '#3B82F6' }]} />
          <Text style={styles.badgeText}>{enCours} En cours</Text>
        </View>

        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: colors.warning || '#F59E0B' }]} />
          <Text style={styles.badgeText}>{total - livrés - enCours} À faire</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface || '#FFF',
    padding: spacing.lg || 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statGroup: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary || '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted || '#64748B',
    marginTop: 2,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary || '#3B82F6',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary || '#3B82F6',
    borderRadius: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
});