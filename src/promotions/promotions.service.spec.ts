// promotions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PromotionsService, CurrentUserPayload } from './promotions.service';
import { Promotion } from './entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Projet } from '../projets/entities/projet.entity';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

describe('PromotionsService', () => {
  let service: PromotionsService;
  const admin: CurrentUserPayload = { sub: 'admin1', role: Role.SUPER_ADMIN };
  const mockPromotionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockProjetRepository = {
    update: jest.fn(),
  };
  const mockNotificationsService = {
    notify: jest.fn(),
    notifyMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: mockPromotionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Projet),
          useValue: mockProjetRepository,
        },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('refuse d’affecter des apprenants à une promotion archivée', async () => {
    mockPromotionRepository.findOne.mockResolvedValue({
      id: 'p1',
      isArchived: true,
      apprenants: [],
    });

    await expect(
      service.assignApprenants('p1', { apprenantIds: ['u1'] }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse d’affecter un utilisateur qui n’a pas le rôle apprenant', async () => {
    mockPromotionRepository.findOne.mockResolvedValue({
      id: 'p1',
      isArchived: false,
      apprenants: [],
    });
    mockUserRepository.find.mockResolvedValue([
      { id: 'u1', role: Role.FORMATEUR, isDeleted: false },
    ]);

    await expect(
      service.assignApprenants('p1', { apprenantIds: ['u1'] }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('create — unicité du nom', () => {
    it('refuse de créer une promotion avec un nom déjà utilisé', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({
        id: 'p1',
        name: 'Promo A',
      });

      await expect(service.create({ name: 'Promo A' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('crée la promotion si le nom est disponible', async () => {
      mockPromotionRepository.findOne.mockResolvedValue(null);
      mockPromotionRepository.create.mockImplementation((data: object) => data);
      mockPromotionRepository.save.mockImplementation((data: object) =>
        Promise.resolve({ id: 'p1', ...data }),
      );

      const result = await service.create({ name: 'Promo B' });
      expect(result).toMatchObject({ name: 'Promo B' });
    });
  });

  describe('update — unicité du nom', () => {
    it('refuse de renommer une promotion avec le nom d’une autre promotion', async () => {
      mockPromotionRepository.findOne
        .mockResolvedValueOnce({ id: 'p1', name: 'Promo A', isArchived: false }) // findOne(id) dans update()
        .mockResolvedValueOnce({ id: 'p2', name: 'Promo B' }); // validateUniqueName

      await expect(
        service.update('p1', { name: 'Promo B' }, admin),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('autorise de garder le même nom (aucun conflit avec soi-même)', async () => {
      mockPromotionRepository.findOne
        .mockResolvedValueOnce({ id: 'p1', name: 'Promo A', isArchived: false }) // findOne(id) dans update()
        .mockResolvedValueOnce({ id: 'p1', name: 'Promo A' }) // validateUniqueName retrouve la même promotion
        .mockResolvedValueOnce({
          id: 'p1',
          name: 'Promo A',
          isArchived: false,
        }); // findOne(id) final

      await expect(
        service.update('p1', { name: 'Promo A' }, admin),
      ).resolves.toBeDefined();
    });
  });

  describe('unarchive', () => {
    it('réactive une promotion archivée', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({
        id: 'p1',
        isArchived: true,
      });
      mockPromotionRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      const result = await service.unarchive('p1', admin);
      expect(result).toMatchObject({ isArchived: false });
    });
  });
});
