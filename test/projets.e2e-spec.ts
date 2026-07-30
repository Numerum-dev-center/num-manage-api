import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AdminProjetsController } from '../src/projets/admin-projets.controller';
import { ProjetsController } from '../src/projets/projets.controller';
import { SoumissionsController } from '../src/projets/soumissions.controller';
import { ProjetsService } from '../src/projets/projets.service';
import { SoumissionsService } from '../src/projets/soumissions.service';
import { Projet } from '../src/projets/entities/projet.entity';
import { Soumission } from '../src/projets/entities/soumission.entity';
import { Promotion } from '../src/promotions/entities/promotion.entity';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/common/enums/role.enum';
import { StatutProjet } from '../src/common/enums/statut-projet.enum';

/**
 * Deux volets :
 * 1) Contrôle d'accès par rôle (Projets/Soumissions mockés) — mêmes principes
 *    que test/users.e2e-spec.ts.
 * 2) Parcours complet Formateur crée → Apprenant soumet → Formateur note
 *    (tickets Lead #384 et Fullstack #399), avec de vrais ProjetsService /
 *    SoumissionsService branchés sur de faux repositories en mémoire, pour
 *    valider la logique métier de bout en bout et pas seulement le routage.
 */
describe('Projets (e2e)', () => {
  describe('contrôle d’accès par rôle', () => {
    let app: INestApplication<App>;
    let jwtService: JwtService;

    const mockProjetsService = {
      findAllForManager: jest.fn().mockResolvedValue([]),
      getFormOptions: jest
        .fn()
        .mockResolvedValue({ formateurs: [], promotions: [] }),
      create: jest.fn().mockResolvedValue({ id: 'p1' }),
      findMine: jest.fn().mockResolvedValue([]),
      getForSoumettre: jest.fn().mockResolvedValue({ id: 'p1' }),
    };
    const mockSoumissionsService = {
      findAllForProjet: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 's1' }),
      noter: jest.fn().mockResolvedValue({ id: 's1', note: 15 }),
    };

    const server = () => app.getHttpServer();
    const tokenFor = (role: Role, sub = 'caller-id') =>
      jwtService.sign({ sub, email: 'caller@example.com', role });

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [JwtModule.register({ secret: 'test-jwt-secret' })],
        controllers: [
          AdminProjetsController,
          ProjetsController,
          SoumissionsController,
        ],
        providers: [
          { provide: ProjetsService, useValue: mockProjetsService },
          { provide: SoumissionsService, useValue: mockSoumissionsService },
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      jwtService = moduleFixture.get(JwtService);
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    const ALL_ROLES = [Role.SUPER_ADMIN, Role.FORMATEUR, Role.APPRENANT];

    const endpoints: Array<{
      label: string;
      method: 'get' | 'post' | 'patch';
      path: string;
      allowedRoles: Role[];
      successStatus: number;
      body?: Record<string, unknown>;
    }> = [
      {
        label: 'GET /admin/projets',
        method: 'get',
        path: '/admin/projets',
        allowedRoles: [Role.SUPER_ADMIN, Role.FORMATEUR],
        successStatus: 200,
      },
      {
        label: 'POST /admin/projets',
        method: 'post',
        path: '/admin/projets',
        allowedRoles: [Role.SUPER_ADMIN, Role.FORMATEUR],
        successStatus: 201,
        body: {
          titre: 'Test',
          description: 'desc',
          technologies: 'Node',
          dateLimite: '2026-08-15T23:59:00',
          promotionId: randomUUID(),
        },
      },
      {
        label: 'GET /admin/projets/:id/soumissions',
        method: 'get',
        path: '/admin/projets/p1/soumissions',
        allowedRoles: [Role.SUPER_ADMIN, Role.FORMATEUR],
        successStatus: 200,
      },
      {
        label: 'GET /projets (apprenant)',
        method: 'get',
        path: '/projets',
        allowedRoles: [Role.APPRENANT],
        successStatus: 200,
      },
      {
        label: 'POST /projets/:id/soumettre',
        method: 'post',
        path: '/projets/p1/soumettre',
        allowedRoles: [Role.APPRENANT],
        successStatus: 201,
        body: {
          lienGithub: 'https://github.com/user/projet',
          lienDemo: 'https://projet.vercel.app',
        },
      },
      {
        label: 'PATCH /soumissions/:id',
        method: 'patch',
        path: '/soumissions/s1',
        allowedRoles: [Role.SUPER_ADMIN, Role.FORMATEUR],
        successStatus: 200,
        body: { note: 15 },
      },
    ];

    describe.each(endpoints)(
      '$label',
      ({ method, path, allowedRoles, successStatus, body }) => {
        it('401 - sans token', () => {
          return request(server())[method](path).send(body).expect(401);
        });

        it.each(ALL_ROLES)('rôle %s', async (role) => {
          const expectedStatus = allowedRoles.includes(role)
            ? successStatus
            : 403;
          await request(server())
            [method](path)
            .set('Authorization', `Bearer ${tokenFor(role)}`)
            .send(body)
            .expect(expectedStatus);
        });
      },
    );
  });

  describe('parcours complet : Formateur crée → Apprenant soumet → Formateur note (#384 #399)', () => {
    let projetsService: ProjetsService;
    let soumissionsService: SoumissionsService;

    const promotionId = randomUUID();
    const formateurId = randomUUID();
    const apprenantId = randomUUID();
    const autrePromotionApprenantId = randomUUID();

    const promotions: Promotion[] = [
      {
        id: promotionId,
        name: 'Promo Test',
        isArchived: false,
        apprenants: [],
      } as unknown as Promotion,
    ];
    const users: User[] = [
      {
        id: apprenantId,
        promotionId,
        isDeleted: false,
        role: Role.APPRENANT,
      } as unknown as User,
      {
        id: autrePromotionApprenantId,
        promotionId: 'autre-promo',
        isDeleted: false,
        role: Role.APPRENANT,
      } as unknown as User,
    ];
    const projets: Projet[] = [];
    const soumissions: Soumission[] = [];

    function makeArrayRepository<T extends { id: string }>(store: T[]) {
      return {
        create: (data: Partial<T>) => ({ id: randomUUID(), ...data }) as T,
        save: (entity: T) => {
          const index = store.findIndex((e) => e.id === entity.id);
          if (index >= 0) {
            store[index] = { ...store[index], ...entity };
            return Promise.resolve(store[index]);
          }
          store.push(entity);
          return Promise.resolve(entity);
        },
        find: (options?: { where?: Record<string, unknown> }) => {
          const where = options?.where ?? {};
          return Promise.resolve(
            store.filter((entity) =>
              Object.entries(where).every(
                ([key, value]) =>
                  (entity as Record<string, unknown>)[key] === value,
              ),
            ),
          );
        },
        findOne: (options?: { where?: Record<string, unknown> }) => {
          const where = options?.where ?? {};
          return Promise.resolve(
            store.find((entity) =>
              Object.entries(where).every(
                ([key, value]) =>
                  (entity as Record<string, unknown>)[key] === value,
              ),
            ) ?? null,
          );
        },
      };
    }

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          ProjetsService,
          SoumissionsService,
          {
            provide: getRepositoryToken(Projet),
            useValue: makeArrayRepository(projets),
          },
          {
            provide: getRepositoryToken(Soumission),
            useValue: makeArrayRepository(soumissions),
          },
          {
            provide: getRepositoryToken(Promotion),
            useValue: makeArrayRepository(promotions),
          },
          {
            provide: getRepositoryToken(User),
            useValue: makeArrayRepository(users),
          },
        ],
      }).compile();

      projetsService = moduleFixture.get(ProjetsService);
      soumissionsService = moduleFixture.get(SoumissionsService);
    });

    let projetId: string;

    it('1. Le formateur crée le projet', async () => {
      const projet = await projetsService.create(
        {
          titre: 'API REST',
          description: 'Construire une API complète',
          technologies: 'Node.js, Express',
          dateLimite: new Date(Date.now() + 86_400_000).toISOString(),
          promotionId,
        },
        formateurId,
      );
      projetId = projet.id;
      expect(projet.titre).toBe('API REST');
    });

    it("2. Le projet apparaît EN_COURS pour l'apprenant assigné", async () => {
      const mesProjects = await projetsService.findMine(apprenantId);
      expect(mesProjects).toHaveLength(1);
      expect(mesProjects[0].statut).toBe(StatutProjet.EN_COURS);
      expect(mesProjects[0].maSoumission).toBeNull();
    });

    it("3. Un apprenant d'une autre promotion ne voit pas ce projet", async () => {
      const mesProjects = await projetsService.findMine(
        autrePromotionApprenantId,
      );
      expect(mesProjects).toHaveLength(0);
    });

    it("4. Un apprenant d'une autre promotion ne peut pas soumettre (règle Lead #383)", async () => {
      await expect(
        soumissionsService.create(
          projetId,
          {
            lienGithub: 'https://github.com/user/projet',
            lienDemo: 'https://projet.vercel.app',
          },
          autrePromotionApprenantId,
        ),
      ).rejects.toBeInstanceOf(Error);
    });

    let soumissionId: string;

    it("5. L'apprenant assigné soumet son travail", async () => {
      const soumission = await soumissionsService.create(
        projetId,
        {
          lienGithub: 'https://github.com/user/projet',
          lienDemo: 'https://projet.vercel.app',
        },
        apprenantId,
      );
      soumissionId = soumission.id;
      expect(soumission.lienGithub).toBe('https://github.com/user/projet');
    });

    it('6. Le projet passe au statut SOUMIS pour cet apprenant', async () => {
      const mesProjects = await projetsService.findMine(apprenantId);
      expect(mesProjects[0].statut).toBe(StatutProjet.SOUMIS);
    });

    it('7. Le formateur voit la soumission dans la liste du projet', async () => {
      const liste = await soumissionsService.findAllForProjet(projetId);
      expect(liste).toHaveLength(1);
      expect(liste[0].id).toBe(soumissionId);
    });

    it('8. Le formateur note la soumission', async () => {
      const notee = await soumissionsService.noter(soumissionId, {
        note: 17,
        feedback: 'Bon travail, structure claire.',
      });
      expect(notee.note).toBe(17);
    });

    it('9. Le projet passe au statut EVALUE pour cet apprenant', async () => {
      const mesProjects = await projetsService.findMine(apprenantId);
      expect(mesProjects[0].statut).toBe(StatutProjet.EVALUE);
    });

    it('10. Une nouvelle soumission est refusée une fois le projet évalué', async () => {
      await expect(
        soumissionsService.create(
          projetId,
          {
            lienGithub: 'https://github.com/user/projet-v2',
            lienDemo: 'https://projet-v2.vercel.app',
          },
          apprenantId,
        ),
      ).rejects.toBeInstanceOf(Error);
    });
  });
});
