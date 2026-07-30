import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

interface SeedAccount {
  label: string;
  firstname: string;
  lastname: string;
  role: Role;
  emailEnvVar: string;
  passwordEnvVar: string;
}

const ACCOUNTS: SeedAccount[] = [
  {
    label: 'Super-admin',
    firstname: 'Super',
    lastname: 'Admin',
    role: Role.SUPER_ADMIN,
    emailEnvVar: 'SEED_ADMIN_EMAIL',
    passwordEnvVar: 'SEED_ADMIN_PASSWORD',
  },
  {
    label: 'Formateur',
    firstname: 'Seed',
    lastname: 'Formateur',
    role: Role.FORMATEUR,
    emailEnvVar: 'SEED_MANAGER_EMAIL',
    passwordEnvVar: 'SEED_MANAGER_PASSWORD',
  },
  {
    label: 'Apprenant',
    firstname: 'Seed',
    lastname: 'Apprenant',
    role: Role.APPRENANT,
    emailEnvVar: 'SEED_STUDENT_EMAIL',
    passwordEnvVar: 'SEED_STUDENT_PASSWORD',
  },
];

async function seedAccount(
  userRepository: Repository<User>,
  account: SeedAccount,
): Promise<void> {
  const email = process.env[account.emailEnvVar];
  const password = process.env[account.passwordEnvVar];

  if (!email || !password) {
    console.log(
      `${account.label} ignoré : ${account.emailEnvVar}/${account.passwordEnvVar} non définies.`,
    );
    return;
  }

  const existing = await userRepository.findOne({ where: { email } });
  if (existing) {
    console.log(`${account.label} existe déjà, seed ignoré.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = userRepository.create({
    firstname: account.firstname,
    lastname: account.lastname,
    email,
    password: hashedPassword,
    role: account.role,
  });
  await userRepository.save(user);

  // Le mot de passe n'est jamais loggé : la personne qui lance le seed l'a
  // déjà (elle vient de le définir dans les variables d'environnement), et
  // ces logs finissent dans les journaux de déploiement (Render, CI...).
  console.log(`${account.label} créé avec succès (${email}).`);
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  for (const account of ACCOUNTS) {
    await seedAccount(userRepository, account);
  }

  await app.close();
}

seed();
