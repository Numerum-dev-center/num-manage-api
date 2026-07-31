import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { Annonce } from '../../annonces/entities/annonce.entity';
import { Ressource } from '../../ressources/entities/ressource.entity';
import { RessourceType } from '../../ressources/enums/ressource-type.enum';
import { Projet } from '../../projets/entities/projet.entity';
import { Soumission } from '../../projets/entities/soumission.entity';

/**
 * Seed de démonstration complet : peuple toutes les tables avec un jeu de
 * données réaliste (1 admin, 2 formateurs, 20 apprenants répartis sur 2
 * promotions, annonces, ressources, projets et soumissions variées) pour un
 * test d'équipe partagé (staging/Aiven). Chaque compte a un mot de passe
 * unique généré aléatoirement, jamais loggé en clair dans la console —
 * uniquement écrit dans un fichier local gitignoré à la fin.
 *
 * Idempotent par email/nom : peut être relancé sans dupliquer les données.
 */

const CREDENTIALS_OUTPUT_PATH = path.join(
  __dirname,
  '../../../seed-demo-credentials.local.md',
);

function generatePassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += charset[crypto.randomInt(0, charset.length)];
  }
  return `${pwd}!`;
}

interface SeededAccount {
  role: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

async function findOrCreateUser(
  userRepository: Repository<User>,
  credentials: SeededAccount[],
  data: {
    firstname: string;
    lastname: string;
    email: string;
    role: Role;
    promotionId?: string;
  },
): Promise<User> {
  const existing = await userRepository.findOne({
    where: { email: data.email },
  });
  if (existing) {
    console.log(`Utilisateur ${data.email} déjà présent, ignoré.`);
    return existing;
  }

  const password = generatePassword();
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = userRepository.create({
    firstname: data.firstname,
    lastname: data.lastname,
    email: data.email,
    password: hashedPassword,
    role: data.role,
    promotionId: data.promotionId,
  });
  const saved = await userRepository.save(user);

  credentials.push({
    role: data.role,
    firstname: data.firstname,
    lastname: data.lastname,
    email: data.email,
    password,
  });
  return saved;
}

async function findOrCreatePromotion(
  promotionRepository: Repository<Promotion>,
  data: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    formateurId: string;
  },
): Promise<Promotion> {
  const existing = await promotionRepository.findOne({
    where: { name: data.name },
  });
  if (existing) {
    console.log(`Promotion "${data.name}" déjà présente, ignorée.`);
    return existing;
  }
  const promotion = promotionRepository.create(data);
  return promotionRepository.save(promotion);
}

async function findOrCreateAnnonce(
  annonceRepository: Repository<Annonce>,
  data: {
    title: string;
    content: string;
    promotionId: string;
    createdById: string;
  },
): Promise<void> {
  const existing = await annonceRepository.findOne({
    where: { title: data.title, promotionId: data.promotionId },
  });
  if (existing) {
    console.log(`Annonce "${data.title}" déjà présente, ignorée.`);
    return;
  }
  await annonceRepository.save(annonceRepository.create(data));
}

async function findOrCreateRessource(
  ressourceRepository: Repository<Ressource>,
  data: {
    type: RessourceType;
    title: string;
    url: string;
    promotionId: string;
    uploadedById: string;
  },
): Promise<void> {
  const existing = await ressourceRepository.findOne({
    where: { title: data.title, promotionId: data.promotionId },
  });
  if (existing) {
    console.log(`Ressource "${data.title}" déjà présente, ignorée.`);
    return;
  }
  await ressourceRepository.save(
    ressourceRepository.create({
      ...data,
      filename: null,
      storedPath: null,
      mimeType: null,
      size: null,
    }),
  );
}

async function findOrCreateProjet(
  projetRepository: Repository<Projet>,
  data: {
    titre: string;
    description: string;
    technologies: string;
    dateLimite: Date;
    promotionId: string;
    createdById: string;
  },
): Promise<Projet> {
  const existing = await projetRepository.findOne({
    where: { titre: data.titre, promotionId: data.promotionId },
  });
  if (existing) {
    console.log(`Projet "${data.titre}" déjà présent, ignoré.`);
    return existing;
  }
  const projet = projetRepository.create(data);
  return projetRepository.save(projet);
}

async function findOrCreateSoumission(
  soumissionRepository: Repository<Soumission>,
  data: {
    projetId: string;
    apprenantId: string;
    lienGithub: string;
    lienDemo: string;
    commentaire?: string;
    note?: number;
    feedback?: string;
  },
): Promise<void> {
  const existing = await soumissionRepository.findOne({
    where: { projetId: data.projetId, apprenantId: data.apprenantId },
  });
  if (existing) {
    return;
  }
  await soumissionRepository.save(
    soumissionRepository.create({
      ...data,
      note: data.note ?? null,
      feedback: data.feedback ?? null,
    }),
  );
}

function inDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function seedDemo() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const promotionRepository = app.get<Repository<Promotion>>(
    getRepositoryToken(Promotion),
  );
  const annonceRepository = app.get<Repository<Annonce>>(
    getRepositoryToken(Annonce),
  );
  const ressourceRepository = app.get<Repository<Ressource>>(
    getRepositoryToken(Ressource),
  );
  const projetRepository = app.get<Repository<Projet>>(
    getRepositoryToken(Projet),
  );
  const soumissionRepository = app.get<Repository<Soumission>>(
    getRepositoryToken(Soumission),
  );

  const credentials: SeededAccount[] = [];

  // --- Admin ---
  await findOrCreateUser(userRepository, credentials, {
    firstname: 'Super',
    lastname: 'Admin',
    email: 'admin@numerum.com',
    role: Role.SUPER_ADMIN,
  });

  // --- Formateurs ---
  const formateur1 = await findOrCreateUser(userRepository, credentials, {
    firstname: 'Fatou',
    lastname: 'Diallo',
    email: 'f.diallo@numerum.com',
    role: Role.FORMATEUR,
  });
  const formateur2 = await findOrCreateUser(userRepository, credentials, {
    firstname: 'Marc',
    lastname: 'Koffi',
    email: 'm.koffi@numerum.com',
    role: Role.FORMATEUR,
  });

  // --- Promotions ---
  const promo1 = await findOrCreatePromotion(promotionRepository, {
    name: 'Développement Web Full-Stack 2026',
    description: 'Formation intensive React/Next.js + NestJS/MySQL.',
    startDate: '2026-01-12',
    endDate: '2026-12-19',
    formateurId: formateur1.id,
  });
  const promo2 = await findOrCreatePromotion(promotionRepository, {
    name: 'Data & Intelligence Artificielle 2026',
    description: 'Formation data science, ML et déploiement de modèles.',
    startDate: '2026-01-12',
    endDate: '2026-12-19',
    formateurId: formateur2.id,
  });

  // --- Apprenants (10 par promotion) ---
  const prenoms = [
    'Awa',
    'Koffi',
    'Léa',
    'Ibrahim',
    'Chloé',
    'Moussa',
    'Fatima',
    'Nathan',
    'Aminata',
    'Julien',
    'Sarah',
    'Yannick',
    'Aïcha',
    'Thomas',
    'Mariam',
    'Kevin',
    'Ndeye',
    'Lucas',
    'Rokia',
    'Hugo',
  ];
  const noms = [
    'Ndiaye',
    'Kouassi',
    'Martin',
    'Traoré',
    'Bernard',
    'Sow',
    'Bamba',
    'Petit',
    'Cissé',
    'Dubois',
    'Konaté',
    'Moreau',
    'Diop',
    'Girard',
    'Keita',
    'Simon',
    'Fall',
    'Michel',
    'Sanogo',
    'Lefebvre',
  ];

  const apprenants: User[] = [];
  for (let i = 0; i < 20; i++) {
    const promotion = i < 10 ? promo1 : promo2;
    const user = await findOrCreateUser(userRepository, credentials, {
      firstname: prenoms[i],
      lastname: noms[i].toUpperCase(),
      email: `apprenant${i + 1}@numerum.com`,
      role: Role.APPRENANT,
      promotionId: promotion.id,
    });
    apprenants.push(user);
  }
  const apprenantsPromo1 = apprenants.slice(0, 10);
  const apprenantsPromo2 = apprenants.slice(10, 20);

  // --- Annonces ---
  await findOrCreateAnnonce(annonceRepository, {
    title: 'Bienvenue dans la promotion !',
    content:
      'Bienvenue à toutes et tous. Consultez régulièrement cet espace pour les annonces importantes et les ressources du parcours.',
    promotionId: promo1.id,
    createdById: formateur1.id,
  });
  await findOrCreateAnnonce(annonceRepository, {
    title: 'Rappel : rendu du projet vendredi',
    content:
      "N'oubliez pas de soumettre votre projet API RESTful avant vendredi 23h59. Toute question, contactez-moi directement.",
    promotionId: promo1.id,
    createdById: formateur1.id,
  });
  await findOrCreateAnnonce(annonceRepository, {
    title: 'Bienvenue dans la promotion !',
    content:
      'Bienvenue dans la promotion Data & IA. Le premier module démarre lundi avec une introduction à Python pour la data science.',
    promotionId: promo2.id,
    createdById: formateur2.id,
  });
  await findOrCreateAnnonce(annonceRepository, {
    title: 'Session de rattrapage samedi',
    content:
      'Une session de rattrapage sur les pipelines ETL aura lieu samedi matin pour celles et ceux qui le souhaitent.',
    promotionId: promo2.id,
    createdById: formateur2.id,
  });

  // --- Ressources (type lien, pas de fichier réel nécessaire pour le seed) ---
  await findOrCreateRessource(ressourceRepository, {
    type: RessourceType.LIEN,
    title: 'Support de cours - Node.js & Express',
    url: 'https://nodejs.org/en/docs',
    promotionId: promo1.id,
    uploadedById: formateur1.id,
  });
  await findOrCreateRessource(ressourceRepository, {
    type: RessourceType.LIEN,
    title: 'Dépôt GitHub du projet fil rouge',
    url: 'https://github.com/numerum-dev-center/projet-fil-rouge',
    promotionId: promo1.id,
    uploadedById: formateur1.id,
  });
  await findOrCreateRessource(ressourceRepository, {
    type: RessourceType.LIEN,
    title: "Dataset d'entraînement (Kaggle)",
    url: 'https://www.kaggle.com/datasets',
    promotionId: promo2.id,
    uploadedById: formateur2.id,
  });
  await findOrCreateRessource(ressourceRepository, {
    type: RessourceType.LIEN,
    title: 'Notebook Jupyter - Introduction au Machine Learning',
    url: 'https://scikit-learn.org/stable/tutorial/index.html',
    promotionId: promo2.id,
    uploadedById: formateur2.id,
  });

  // --- Projets + soumissions ---
  const projet1 = await findOrCreateProjet(projetRepository, {
    titre: "Développement d'une API RESTful avec NestJS",
    description:
      "Implémentez l'authentification JWT et les endpoints CRUD pour la gestion de stock.",
    technologies: 'NestJS, TypeORM, MySQL',
    dateLimite: inDays(-3), // en retard, pour tester le badge rouge
    promotionId: promo1.id,
    createdById: formateur1.id,
  });
  const projet2 = await findOrCreateProjet(projetRepository, {
    titre: 'Interface React - Dashboard Admin',
    description:
      'Construisez un tableau de bord administrateur avec filtres et graphiques.',
    technologies: 'React, Next.js, Tailwind CSS',
    dateLimite: inDays(10),
    promotionId: promo1.id,
    createdById: formateur1.id,
  });
  const projet3 = await findOrCreateProjet(projetRepository, {
    titre: 'Pipeline ETL avec Python',
    description:
      "Concevez un pipeline d'extraction, transformation et chargement de données.",
    technologies: 'Python, Pandas, Airflow',
    dateLimite: inDays(-2),
    promotionId: promo2.id,
    createdById: formateur2.id,
  });
  const projet4 = await findOrCreateProjet(projetRepository, {
    titre: 'Modèle de classification ML',
    description:
      'Entraînez et évaluez un modèle de classification sur le dataset fourni.',
    technologies: 'Python, scikit-learn, Jupyter',
    dateLimite: inDays(12),
    promotionId: promo2.id,
    createdById: formateur2.id,
  });

  // Répartition des soumissions par projet : 4 évaluées, 3 soumises (non
  // notées), 3 non soumises — pour couvrir tous les statuts visuels.
  async function seedSoumissionsPourProjet(
    projet: Projet,
    apprenantsCibles: User[],
  ) {
    for (let i = 0; i < 4; i++) {
      await findOrCreateSoumission(soumissionRepository, {
        projetId: projet.id,
        apprenantId: apprenantsCibles[i].id,
        lienGithub: `https://github.com/${apprenantsCibles[i].firstname.toLowerCase()}/projet-${projet.id.slice(0, 8)}`,
        lienDemo: `https://${apprenantsCibles[i].firstname.toLowerCase()}-projet.vercel.app`,
        commentaire: 'Voici mon rendu, merci pour votre retour !',
        note: 12 + i * 2,
        feedback: 'Bon travail, structure claire et code propre.',
      });
    }
    for (let i = 4; i < 7; i++) {
      await findOrCreateSoumission(soumissionRepository, {
        projetId: projet.id,
        apprenantId: apprenantsCibles[i].id,
        lienGithub: `https://github.com/${apprenantsCibles[i].firstname.toLowerCase()}/projet-${projet.id.slice(0, 8)}`,
        lienDemo: `https://${apprenantsCibles[i].firstname.toLowerCase()}-projet.vercel.app`,
      });
    }
    // Les 3 derniers apprenants ne soumettent rien (statut "en_cours").
  }

  await seedSoumissionsPourProjet(projet1, apprenantsPromo1);
  await seedSoumissionsPourProjet(projet2, apprenantsPromo1);
  await seedSoumissionsPourProjet(projet3, apprenantsPromo2);
  await seedSoumissionsPourProjet(projet4, apprenantsPromo2);

  // --- Écriture du fichier local de credentials (jamais commité) ---
  if (credentials.length > 0) {
    const lines = [
      '# Comptes de test seedés — NE PAS COMMITER',
      '',
      `Généré le ${new Date().toISOString()}`,
      '',
      '| Rôle | Prénom | Nom | Email | Mot de passe |',
      '|------|--------|-----|-------|--------------|',
      ...credentials.map(
        (c) =>
          `| ${c.role} | ${c.firstname} | ${c.lastname} | ${c.email} | ${c.password} |`,
      ),
      '',
    ];
    fs.writeFileSync(CREDENTIALS_OUTPUT_PATH, lines.join('\n'), 'utf-8');
    console.log(
      `\n${credentials.length} nouveau(x) compte(s) créé(s). Identifiants écrits dans :\n${CREDENTIALS_OUTPUT_PATH}\n`,
    );
  } else {
    console.log('\nAucun nouveau compte créé (déjà tous présents).\n');
  }

  console.log('Seed de démonstration terminé.');
  await app.close();
}

seedDemo().catch((err) => {
  console.error('Erreur pendant le seed de démonstration :', err);
  process.exit(1);
});
