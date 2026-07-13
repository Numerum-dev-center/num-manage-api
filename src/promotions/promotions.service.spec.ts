// promotions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { Promotion } from './entities/promotion.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

describe('PromotionsService', () => {
  let service: PromotionsService;
  const mockPromotionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
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
      service.assignApprenants('p1', { apprenantIds: ['u1'] }),
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
      service.assignApprenants('p1', { apprenantIds: ['u1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
