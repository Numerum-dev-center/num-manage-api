// projets.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjetsService } from './projets.service';
import { Projet } from './entities/projet.entity';
import { Soumission } from './entities/soumission.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { StatutProjet } from '../common/enums/statut-projet.enum';

describe('ProjetsService', () => {
  let service: ProjetsService;

  const mockProjetRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockSoumissionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockPromotionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjetsService,
        { provide: getRepositoryToken(Projet), useValue: mockProjetRepository },
        {
          provide: getRepositoryToken(Soumission),
          useValue: mockSoumissionRepository,
        },
        {
          provide: getRepositoryToken(Promotion),
          useValue: mockPromotionRepository,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<ProjetsService>(ProjetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      titre: 'API REST',
      description: 'Construire une API',
      technologies: 'Node.js',
      dateLimite: '2026-08-15T23:59:00',
      promotionId: 'promo-1',
    };

    it("lève une NotFoundException si la promotion n'existe pas", async () => {
      mockPromotionRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, 'formateur-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuse de créer un projet sur une promotion archivée', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({
        id: 'promo-1',
        isArchived: true,
      });

      await expect(service.create(dto, 'formateur-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('crée le projet si la promotion existe et est active', async () => {
      mockPromotionRepository.findOne.mockResolvedValue({
        id: 'promo-1',
        isArchived: false,
      });
      mockProjetRepository.create.mockImplementation((data: object) => data);
      mockProjetRepository.save.mockResolvedValue({ id: 'projet-1', ...dto });
      mockProjetRepository.findOne.mockResolvedValue({
        id: 'projet-1',
        ...dto,
        soumissions: [],
      });

      const result = await service.create(dto, 'formateur-1');
      expect(result).toMatchObject({ id: 'projet-1' });
      expect(mockProjetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          promotionId: 'promo-1',
          createdById: 'formateur-1',
        }),
      );
    });
  });

  describe('findOne', () => {
    it("lève une NotFoundException si le projet n'existe pas", async () => {
      mockProjetRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAllForManager — statut agrégé (#387)', () => {
    const dateLimiteFuture = new Date(Date.now() + 86_400_000);
    const dateLimitePassee = new Date(Date.now() - 86_400_000);

    it("statut EN_COURS quand personne n'a encore soumis", async () => {
      mockProjetRepository.find.mockResolvedValue([
        {
          id: 'p1',
          dateLimite: dateLimiteFuture,
          promotion: { apprenants: [{ id: 'a1' }, { id: 'a2' }] },
          soumissions: [],
        },
      ]);

      const result = await service.findAllForManager();
      expect(result[0]).toMatchObject({
        statut: StatutProjet.EN_COURS,
        enRetard: false,
        totalSoumissions: 0,
      });
    });

    it('signale enRetard quand la date limite est dépassée et tout le monde n’a pas rendu', async () => {
      mockProjetRepository.find.mockResolvedValue([
        {
          id: 'p1',
          dateLimite: dateLimitePassee,
          promotion: { apprenants: [{ id: 'a1' }, { id: 'a2' }] },
          soumissions: [{ note: null }],
        },
      ]);

      const result = await service.findAllForManager();
      expect(result[0].enRetard).toBe(true);
    });

    it('statut SOUMIS quand tout le monde a rendu mais rien n’est noté', async () => {
      mockProjetRepository.find.mockResolvedValue([
        {
          id: 'p1',
          dateLimite: dateLimiteFuture,
          promotion: { apprenants: [{ id: 'a1' }, { id: 'a2' }] },
          soumissions: [{ note: null }, { note: null }],
        },
      ]);

      const result = await service.findAllForManager();
      expect(result[0].statut).toBe(StatutProjet.SOUMIS);
    });

    it('statut EVALUE quand toutes les soumissions sont notées', async () => {
      mockProjetRepository.find.mockResolvedValue([
        {
          id: 'p1',
          dateLimite: dateLimiteFuture,
          promotion: { apprenants: [{ id: 'a1' }, { id: 'a2' }] },
          soumissions: [{ note: 15 }, { note: 18 }],
        },
      ]);

      const result = await service.findAllForManager();
      expect(result[0]).toMatchObject({
        statut: StatutProjet.EVALUE,
        enRetard: false,
      });
    });
  });

  describe('findMine — statut personnel de l’apprenant (#394)', () => {
    it("retourne un tableau vide si l'apprenant n'a pas de promotion", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'a1',
        promotionId: null,
      });

      const result = await service.findMine('a1');
      expect(result).toEqual([]);
    });

    it('calcule EN_COURS sans soumission et SOUMIS/EVALUE selon la note', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'a1',
        promotionId: 'promo-1',
      });
      mockProjetRepository.find.mockResolvedValue([
        {
          id: 'p1',
          promotionId: 'promo-1',
          dateLimite: new Date(Date.now() + 86_400_000),
        },
        {
          id: 'p2',
          promotionId: 'promo-1',
          dateLimite: new Date(Date.now() + 86_400_000),
        },
      ]);
      mockSoumissionRepository.find.mockResolvedValue([
        { projetId: 'p2', note: null },
      ]);

      const result = await service.findMine('a1');
      expect(result.find((p) => p.id === 'p1')?.statut).toBe(
        StatutProjet.EN_COURS,
      );
      expect(result.find((p) => p.id === 'p2')?.statut).toBe(
        StatutProjet.SOUMIS,
      );
    });
  });

  describe('getForSoumettre', () => {
    it("lève une NotFoundException si l'apprenant n'appartient pas à la promotion du projet", async () => {
      mockProjetRepository.findOne.mockResolvedValue({
        id: 'p1',
        promotionId: 'promo-1',
        soumissions: [],
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 'a1',
        promotionId: 'autre-promo',
      });

      await expect(service.getForSoumettre('p1', 'a1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
