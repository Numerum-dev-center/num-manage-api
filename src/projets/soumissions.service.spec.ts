// soumissions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SoumissionsService } from './soumissions.service';
import { Soumission } from './entities/soumission.entity';
import { Projet } from './entities/projet.entity';
import { ProjetPoste } from './entities/projet-poste.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('SoumissionsService', () => {
  let service: SoumissionsService;

  const mockSoumissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockProjetRepository = {
    findOne: jest.fn(),
  };
  const mockProjetPosteRepository = {
    findOne: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
  };
  const mockNotificationsService = {
    notify: jest.fn(),
    notifyMany: jest.fn(),
  };

  const dto = {
    lienGithub: 'https://github.com/user/projet',
    lienDemo: 'https://projet.vercel.app',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoumissionsService,
        {
          provide: getRepositoryToken(Soumission),
          useValue: mockSoumissionRepository,
        },
        { provide: getRepositoryToken(Projet), useValue: mockProjetRepository },
        {
          provide: getRepositoryToken(ProjetPoste),
          useValue: mockProjetPosteRepository,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SoumissionsService>(SoumissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create — règle Lead #383 : seul l’apprenant assigné peut soumettre', () => {
    it("lève une NotFoundException si le projet n'existe pas", async () => {
      mockProjetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('projet-inconnu', dto, 'a1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuse la soumission d'un apprenant non affecté au projet (pas sur le roster)", async () => {
      mockProjetRepository.findOne.mockResolvedValue({
        id: 'p1',
        promotionId: 'promo-1',
      });
      mockProjetPosteRepository.findOne.mockResolvedValue(null);

      await expect(service.create('p1', dto, 'a1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('crée une nouvelle soumission pour un apprenant assigné', async () => {
      mockProjetRepository.findOne.mockResolvedValue({
        id: 'p1',
        promotionId: 'promo-1',
      });
      mockProjetPosteRepository.findOne.mockResolvedValue({
        id: 'roster-1',
        projetId: 'p1',
        apprenantId: 'a1',
      });
      mockSoumissionRepository.findOne.mockResolvedValue(null);
      mockSoumissionRepository.create.mockImplementation(
        (data: object) => data,
      );
      mockSoumissionRepository.save.mockImplementation((data: object) =>
        Promise.resolve({ id: 's1', ...data }),
      );

      const result = await service.create('p1', dto, 'a1');
      expect(result).toMatchObject({ projetId: 'p1', apprenantId: 'a1' });
    });

    it('remplace une soumission existante non notée (resoumission)', async () => {
      mockProjetRepository.findOne.mockResolvedValue({
        id: 'p1',
        promotionId: 'promo-1',
      });
      mockProjetPosteRepository.findOne.mockResolvedValue({
        id: 'roster-1',
        projetId: 'p1',
        apprenantId: 'a1',
      });
      mockSoumissionRepository.findOne.mockResolvedValue({
        id: 's1',
        projetId: 'p1',
        apprenantId: 'a1',
        note: null,
        lienGithub: 'https://github.com/user/ancien',
      });
      mockSoumissionRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      const result = await service.create('p1', dto, 'a1');
      expect(result).toMatchObject({ id: 's1', lienGithub: dto.lienGithub });
    });

    it('refuse de modifier une soumission déjà notée', async () => {
      mockProjetRepository.findOne.mockResolvedValue({
        id: 'p1',
        promotionId: 'promo-1',
      });
      mockProjetPosteRepository.findOne.mockResolvedValue({
        id: 'roster-1',
        projetId: 'p1',
        apprenantId: 'a1',
      });
      mockSoumissionRepository.findOne.mockResolvedValue({
        id: 's1',
        projetId: 'p1',
        apprenantId: 'a1',
        note: 18,
      });

      await expect(service.create('p1', dto, 'a1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('noter', () => {
    it("lève une NotFoundException si la soumission n'existe pas", async () => {
      mockSoumissionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.noter('inconnue', { note: 15 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('enregistre la note et le feedback', async () => {
      mockSoumissionRepository.findOne.mockResolvedValue({
        id: 's1',
        apprenantId: 'a1',
        note: null,
        feedback: null,
        projet: { titre: 'API REST' },
      });
      mockSoumissionRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      const result = await service.noter('s1', {
        note: 17,
        feedback: 'Bon travail',
      });
      expect(result).toMatchObject({ note: 17, feedback: 'Bon travail' });
    });
  });

  describe('findAllForProjet', () => {
    it("lève une NotFoundException si le projet n'existe pas", async () => {
      mockProjetRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllForProjet('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
