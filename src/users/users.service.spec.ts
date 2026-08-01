// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';

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

  describe('create', () => {
    const createDto = {
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      password: 'Password!23',
      role: Role.APPRENANT,
    };

    it("lève une ConflictException si l'email est déjà utilisé", async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existant' });

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('hash le mot de passe avant de sauvegarder', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data: object) => data);
      mockUserRepository.save.mockImplementation((data: any) =>
        Promise.resolve(data),
      );

      const result = await service.create(createDto);

      expect(result.password).not.toBe(createDto.password);
      expect(await bcrypt.compare(createDto.password, result.password!)).toBe(
        true,
      );
    });
  });

  describe('findAll', () => {
    it('ne retourne que les utilisateurs non supprimés', async () => {
      const users = [{ id: 'u1', isDeleted: false }];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { isDeleted: false },
        relations: { promotion: true },
      });
      expect(result).toBe(users);
    });
  });

  describe('findOne', () => {
    it("lève une NotFoundException si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("retourne l'utilisateur trouvé (non supprimé)", async () => {
      const user = { id: 'u1', isDeleted: false };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne('u1');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'u1', isDeleted: false },
        relations: { promotion: true },
      });
      expect(result).toBe(user);
    });
  });

  describe('softDelete', () => {
    it("lève une NotFoundException si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.softDelete('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('marque isDeleted à true sans supprimer la ligne', async () => {
      const user = { id: 'u1', isDeleted: false };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      await service.softDelete('u1');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', isDeleted: true }),
      );
    });
  });

  describe('toggleActive', () => {
    it("lève une NotFoundException si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleActive('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('inverse le flag isActive (true -> false)', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        isDeleted: false,
        isActive: true,
      });
      mockUserRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      const result = await service.toggleActive('u1');

      expect(result).toMatchObject({ isActive: false });
    });

    it('inverse le flag isActive (false -> true)', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        isDeleted: false,
        isActive: false,
      });
      mockUserRepository.save.mockImplementation((data: object) =>
        Promise.resolve(data),
      );

      const result = await service.toggleActive('u1');

      expect(result).toMatchObject({ isActive: true });
    });
  });

  describe('validatePassword', () => {
    it("retourne false si l'utilisateur n'a pas de mot de passe (ex: compte Google)", async () => {
      const result = await service.validatePassword(
        { password: null } as unknown as User,
        'peu importe',
      );

      expect(result).toBe(false);
    });

    it('retourne true si le mot de passe correspond au hash', async () => {
      const hashed = await bcrypt.hash('Password!23', 10);

      const result = await service.validatePassword(
        { password: hashed } as unknown as User,
        'Password!23',
      );

      expect(result).toBe(true);
    });

    it('retourne false si le mot de passe ne correspond pas', async () => {
      const hashed = await bcrypt.hash('Password!23', 10);

      const result = await service.validatePassword(
        { password: hashed } as unknown as User,
        'MauvaisMotDePasse',
      );

      expect(result).toBe(false);
    });
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

    it('autorise de garder le même email (aucun conflit avec soi-même)', async () => {
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

    it('met à jour les champs fournis (ex: specialite)', async () => {
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
