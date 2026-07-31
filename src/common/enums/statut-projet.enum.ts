/**
 * Statut d'avancement d'un projet pour un apprenant donné (ticket Lead #382).
 *
 * NON_COMMENCE est réservé à une future notion de projet "non encore publié" ;
 * à ce jour un projet est immédiatement accessible à tous les apprenants de la
 * promotion dès sa création, donc le calcul ne produit jamais cette valeur -
 * elle reste définie pour permettre l'affichage des 4 étapes du parcours (#396).
 */
export enum StatutProjet {
  NON_COMMENCE = 'non_commence',
  EN_COURS = 'en_cours',
  SOUMIS = 'soumis',
  EVALUE = 'evalue',
}
