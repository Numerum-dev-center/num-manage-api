// annonces.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnnoncesService } from './annonces.service';
import { Annonce } from './entities/annonce.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('AnnoncesService', () => {
  let service: AnnoncesService;
  const mockAnnonceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const mockPromotionRepository = {
    findOne: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockNotificationsService = {
    notify: jest.fn(),
    notifyMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUserRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnoncesService,
        {
          provide: getRepositoryToken(Annonce),
          useValue: mockAnnonceRepository,
        },
        {
          provide: getRepositoryToken(Promotion),
          useValue: mockPromotionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AnnoncesService>(AnnoncesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it("lève une NotFoundException si la promotion ciblée n'existe pas", async () => {
      mockPromotionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          { promotionId: 'inconnue', title: 'Titre', content: 'Contenu' },
          'formateur-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse de publier une annonce sur une promotion archivée', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({
        id: 'promo-A',
        isArchived: true,
      });

      await expect(
        service.create(
          { promotionId: 'promo-A', title: 'Titre', content: 'Contenu' },
          'formateur-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crée une annonce ciblée sur la promotion', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({ id: 'promo-A' });
      mockAnnonceRepository.create.mockImplementation((data: object) => data);
      mockAnnonceRepository.save.mockImplementation((data: object) =>
        Promise.resolve({ id: 'a1', ...data }),
      );

      const result = await service.create(
        { promotionId: 'promo-A', title: 'Titre', content: 'Contenu' },
        'formateur-1',
      );

      expect(result).toMatchObject({
        title: 'Titre',
        content: 'Contenu',
        promotionId: 'promo-A',
        createdById: 'formateur-1',
      });
    });
  });

  describe('findAllForManager', () => {
    it('filtre par promotion', async () => {
      mockAnnonceRepository.find.mockResolvedValue([]);

      await service.findAllForManager('promo-A');

      expect(mockAnnonceRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { promotionId: 'promo-A' } }),
      );
    });

    it('liste toutes les annonces sans filtre', async () => {
      mockAnnonceRepository.find.mockResolvedValue([]);

      await service.findAllForManager();

      expect(mockAnnonceRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findMine', () => {
    it("retourne une liste vide si l'apprenant n'a pas de promotion", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        promotionId: null,
        isDeleted: false,
      });

      const result = await service.findMine('u1');
      expect(result).toEqual([]);
      expect(mockAnnonceRepository.find).not.toHaveBeenCalled();
    });

    it("ne retourne que les annonces de la promotion de l'apprenant", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        promotionId: 'promo-A',
        isDeleted: false,
      });
      mockAnnonceRepository.find.mockResolvedValue([
        { id: 'a1', promotionId: 'promo-A' },
      ]);

      const result = await service.findMine('u1');
      expect(result).toHaveLength(1);
      expect(mockAnnonceRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { promotionId: 'promo-A' } }),
      );
    });
  });
});
