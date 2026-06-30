import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(getRepositoryToken(User));

  const existingAdmin = await userRepository.findOne({
    where: { email: process.env.SEED_ADMIN_EMAIL },
  });

  if (existingAdmin) {
    console.log('Le super-admin existe déjà, seed ignoré.');
    await app.close();
    return;
  }

  const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD!, 10);

  const superAdmin = userRepository.create({
    firstname: 'Super',
    lastname: 'Admin',
    email: process.env.SEED_ADMIN_EMAIL,
    password: hashedPassword,
    role: Role.SUPER_ADMIN,
  });

  await userRepository.save(superAdmin);

  console.log('Super-admin créé avec succès.');
  console.log('Email: ' + process.env.SEED_ADMIN_EMAIL);
  console.log('Mot de passe: ' + process.env.SEED_ADMIN_PASSWORD);

  await app.close();
}

seed();