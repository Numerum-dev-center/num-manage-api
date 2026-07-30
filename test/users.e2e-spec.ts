import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/common/enums/role.enum';

/**
 * Vérifie, pour chaque fonctionnalité déjà implémentée du module Users
 * (create, findAll, findOne, updateMe, update, softDelete, toggleActive),
 * que l'accès est correctement restreint selon le rôle porté par le JWT :
 * SUPER_ADMIN ('admin'), FORMATEUR ('manager'), APPRENANT ('student'),
 * ainsi que le cas non authentifié.
 *
 * UsersService est mocké : ce test cible le chaînage JwtAuthGuard + RolesGuard
 * + @Roles(), pas la logique métier (déjà couverte par users.service.spec.ts).
 */
describe("Users - contrôle d'accès par rôle (e2e)", () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const existingUser = {
    id: 'user-1',
    firstname: 'Jean',
    lastname: 'Dupont',
    email: 'jean.dupont@example.com',
    role: Role.APPRENANT,
    isActive: true,
  };

  const mockUsersService = {
    create: jest.fn().mockResolvedValue(existingUser),
    findAll: jest.fn().mockResolvedValue([existingUser]),
    findOne: jest.fn().mockResolvedValue(existingUser),
    update: jest.fn().mockResolvedValue(existingUser),
    softDelete: jest.fn().mockResolvedValue(undefined),
    toggleActive: jest
      .fn()
      .mockResolvedValue({ ...existingUser, isActive: false }),
  };

  const server = () => app.getHttpServer();

  const tokenFor = (role: Role, sub = 'caller-id') =>
    jwtService.sign({ sub, email: 'caller@example.com', role });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-jwt-secret' })],
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const ALL_ROLES = [Role.SUPER_ADMIN, Role.FORMATEUR, Role.APPRENANT];

  type Endpoint = {
    label: string;
    method: 'post' | 'get' | 'patch' | 'delete';
    path: string;
    allowedRoles: Role[];
    successStatus: number;
    body?: Record<string, unknown>;
  };

  const endpoints: Endpoint[] = [
    {
      label: 'POST /users (create)',
      method: 'post',
      path: '/users',
      allowedRoles: [Role.SUPER_ADMIN],
      successStatus: 201,
      body: {
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.com',
        password: 'Password!23',
      },
    },
    {
      label: 'GET /users (findAll)',
      method: 'get',
      path: '/users',
      allowedRoles: [Role.SUPER_ADMIN, Role.FORMATEUR],
      successStatus: 200,
    },
    {
      label: 'GET /users/:id (findOne)',
      method: 'get',
      path: '/users/user-1',
      allowedRoles: [Role.SUPER_ADMIN, Role.FORMATEUR],
      successStatus: 200,
    },
    {
      label: 'PATCH /users/:id (update)',
      method: 'patch',
      path: '/users/user-1',
      allowedRoles: [Role.SUPER_ADMIN],
      successStatus: 200,
      body: { specialite: 'Développeur Full-Stack' },
    },
    {
      label: 'DELETE /users/:id (softDelete)',
      method: 'delete',
      path: '/users/user-1',
      allowedRoles: [Role.SUPER_ADMIN],
      successStatus: 204,
    },
    {
      label: 'PATCH /users/:id/toggle-active (toggleActive)',
      method: 'patch',
      path: '/users/user-1/toggle-active',
      allowedRoles: [Role.SUPER_ADMIN],
      successStatus: 200,
    },
  ];

  describe.each(endpoints)(
    '$label',
    ({ method, path, allowedRoles, successStatus, body }) => {
      it('401 - sans token (non authentifié)', () => {
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

  describe('PATCH /users/me (updateMe) - tout utilisateur authentifié', () => {
    const body = { firstname: 'NouveauPrenom' };

    it('401 - sans token', () => {
      return request(server()).patch('/users/me').send(body).expect(401);
    });

    it.each(ALL_ROLES)(
      '200 pour un rôle %s (chacun peut modifier son propre profil)',
      async (role) => {
        await request(server())
          .patch('/users/me')
          .set('Authorization', `Bearer ${tokenFor(role, 'self-id')}`)
          .send(body)
          .expect(200);

        expect(mockUsersService.update).toHaveBeenCalledWith('self-id', body);
      },
    );
  });

  it('401 - token JWT invalide', () => {
    return request(server())
      .get('/users')
      .set('Authorization', 'Bearer token-invalide')
      .expect(401);
  });
});
