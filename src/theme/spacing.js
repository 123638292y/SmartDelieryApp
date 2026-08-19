/**
 * Système d'espacement basé sur une échelle de 8px (standard mobile)
 */
export const spacing = {
  // --- Espacements de base ---
  tiny: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,     // L'espacement le plus utilisé (Standard)
  xl: 24,     // Pour les marges entre grandes sections
  xxl: 32,    // Pour le haut des écrans ou les logos
  xxxl: 48,
  huge: 64,

  // --- Layout spécifique ---
  screenPadding: 20,    // La marge horizontale standard sur tous les écrans
  cardPadding: 16,      // Padding interne des cartes
  inputHeight: 52,      // Hauteur standard des champs de saisie
  borderRadius: 10,     // Arrondi standard des coins
};

export default spacing;