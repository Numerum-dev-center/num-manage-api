// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it("lève une NotFoundException si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnu', { email: 'x@example.com' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuse de changer l'email vers un email déjà utilisé par un autre utilisateur", async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce({
          id: 'u1',
          email: 'ancien@example.com',
          isDeleted: false,
        }) // findOne(id) via this.findOne()
        .mockResolvedValueOnce({ id: 'u2', email: 'nouveau@example.com' }); // recherche d'unicité

      await expect(
        service.update('u1', { email: 'nouveau@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("autorise de garder le même email (aucun conflit avec soi-même)", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        email: 'moi@example.com',
        isDeleted: false,
      });
      mockUserRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      await expect(
        service.update('u1', { email: 'moi@example.com' }),
      ).resolves.toBeDefined();
    });

    it("met à jour les champs fournis (ex: specialite)", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        email: 'moi@example.com',
        isDeleted: false,
      });
      mockUserRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      const result = await service.update('u1', {
        specialite: 'Développeur Full-Stack',
      });
      expect(result).toMatchObject({ specialite: 'Développeur Full-Stack' });
    });
  });
});
