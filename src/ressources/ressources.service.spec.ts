// ressources.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RessourcesService } from './ressources.service';
import { Ressource } from './entities/ressource.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RessourceType } from './enums/ressource-type.enum';
import { NotificationsService } from '../notifications/notifications.service';

describe('RessourcesService', () => {
  let service: RessourcesService;
  const mockRessourceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
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
        RessourcesService,
        {
          provide: getRepositoryToken(Ressource),
          useValue: mockRessourceRepository,
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

    service = module.get<RessourcesService>(RessourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getForDownload — ciblage par promotion', () => {
    it("refuse le téléchargement à un apprenant d'une autre promotion", async () => {
      mockRessourceRepository.findOne.mockResolvedValue({
        id: 'r1',
        promotionId: 'promo-A',
        storedPath: '/uploads/ressources/r1.pdf',
        filename: 'cours.pdf',
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        promotionId: 'promo-B',
        isDeleted: false,
      });

      await expect(
        service.getForDownload('r1', { sub: 'u1', role: Role.APPRENANT }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse le téléchargement à un apprenant sans promotion', async () => {
      mockRessourceRepository.findOne.mockResolvedValue({
        id: 'r1',
        promotionId: 'promo-A',
        storedPath: '/uploads/ressources/r1.pdf',
        filename: 'cours.pdf',
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        promotionId: null,
        isDeleted: false,
      });

      await expect(
        service.getForDownload('r1', { sub: 'u1', role: Role.APPRENANT }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('autorise le téléchargement à un apprenant de la bonne promotion', async () => {
      mockRessourceRepository.findOne.mockResolvedValue({
        id: 'r1',
        promotionId: 'promo-A',
        storedPath: '/uploads/ressources/r1.pdf',
        filename: 'cours.pdf',
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        promotionId: 'promo-A',
        isDeleted: false,
      });

      const result = await service.getForDownload('r1', {
        sub: 'u1',
        role: Role.APPRENANT,
      });
      expect(result.id).toBe('r1');
    });

    it('autorise le formateur sans vérifier la promotion', async () => {
      mockRessourceRepository.findOne.mockResolvedValue({
        id: 'r1',
        promotionId: 'promo-A',
        storedPath: '/uploads/ressources/r1.pdf',
        filename: 'cours.pdf',
      });

      const result = await service.getForDownload('r1', {
        sub: 'formateur-1',
        role: Role.FORMATEUR,
      });
      expect(result.id).toBe('r1');
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('lève une NotFoundException si la ressource n’existe pas', async () => {
      mockRessourceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getForDownload('inconnue', {
          sub: 'u1',
          role: Role.APPRENANT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
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
      expect(mockRessourceRepository.find).not.toHaveBeenCalled();
    });

    it("ne retourne que les ressources de la promotion de l'apprenant", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        promotionId: 'promo-A',
        isDeleted: false,
      });
      mockRessourceRepository.find.mockResolvedValue([
        { id: 'r1', promotionId: 'promo-A' },
      ]);

      const result = await service.findMine('u1');
      expect(result).toHaveLength(1);
      expect(mockRessourceRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { promotionId: 'promo-A' } }),
      );
    });
  });

  describe('create', () => {
    it("lève une NotFoundException si la promotion ciblée n'existe pas", async () => {
      mockPromotionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          { path: '/tmp/x.pdf', originalname: 'x.pdf' } as Express.Multer.File,
          { promotionId: 'inconnue' },
          'formateur-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('crée une ressource de type lien quand aucun fichier n’est fourni', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({ id: 'promo-A' });
      mockRessourceRepository.create.mockImplementation((data: object) => data);
      mockRessourceRepository.save.mockImplementation((data: object) =>
        Promise.resolve({ id: 'r1', ...data }),
      );

      const result = await service.create(
        undefined,
        { promotionId: 'promo-A', url: 'https://example.com/support.pdf' },
        'formateur-1',
      );

      expect(result).toMatchObject({
        type: RessourceType.LIEN,
        url: 'https://example.com/support.pdf',
        storedPath: null,
        filename: null,
      });
    });

    it('déduit le type ZIP depuis l’extension du fichier envoyé', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({ id: 'promo-A' });
      mockRessourceRepository.create.mockImplementation((data: object) => data);
      mockRessourceRepository.save.mockImplementation((data: object) =>
        Promise.resolve({ id: 'r1', ...data }),
      );

      const result = await service.create(
        {
          path: '/tmp/archive.zip',
          originalname: 'archive.zip',
          mimetype: 'application/zip',
          size: 1234,
        } as Express.Multer.File,
        { promotionId: 'promo-A' },
        'formateur-1',
      );

      expect(result).toMatchObject({ type: RessourceType.ZIP, url: null });
    });
  });

  describe('findAllForManager', () => {
    it('filtre par promotion et par type', async () => {
      mockRessourceRepository.find.mockResolvedValue([]);

      await service.findAllForManager('promo-A', RessourceType.LIEN);

      expect(mockRessourceRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { promotionId: 'promo-A', type: RessourceType.LIEN },
        }),
      );
    });
  });

  describe('remove', () => {
    it('ne tente pas de supprimer un fichier disque pour une ressource de type lien', async () => {
      mockRessourceRepository.findOne.mockResolvedValue({
        id: 'r1',
        storedPath: null,
      });

      await expect(service.remove('r1')).resolves.toBeUndefined();
      expect(mockRessourceRepository.remove).toHaveBeenCalled();
    });
  });
});
