import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('AuthService — révocation du refresh token au logout', () => {
  let service: AuthService;
  const mockUserRepository = {
    findOne: jest.fn(),
    increment: jest.fn(),
  };
  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return undefined;
    }),
  };
  const mockRes = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as import('express').Response;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('logout() incrémente refreshTokenVersion et vide le cookie', async () => {
    await service.logout('user-1', mockRes);

    expect(mockUserRepository.increment).toHaveBeenCalledWith(
      { id: 'user-1' },
      'refreshTokenVersion',
      1,
    );
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.any(Object),
    );
  });

  it('refresh() rejette un token dont la version (tv) ne correspond plus à refreshTokenVersion en base (révoqué par un logout)', async () => {
    mockJwtService.verify.mockReturnValue({ sub: 'user-1', tv: 0 });
    mockUserRepository.findOne.mockResolvedValue({
      id: 'user-1',
      isDeleted: false,
      isActive: true,
      refreshTokenVersion: 1, // a bumpé depuis (logout entre-temps)
    });

    const req = { cookies: { refreshToken: 'old-token' } } as any;

    await expect(service.refresh(req, mockRes)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh() accepte un token dont la version correspond toujours à refreshTokenVersion en base', async () => {
    mockJwtService.verify.mockReturnValue({ sub: 'user-1', tv: 2 });
    mockJwtService.sign.mockReturnValue('new-access-token');
    mockUserRepository.findOne.mockResolvedValue({
      id: 'user-1',
      isDeleted: false,
      isActive: true,
      refreshTokenVersion: 2,
    });

    const req = { cookies: { refreshToken: 'current-token' } } as any;

    const result = await service.refresh(req, mockRes);
    expect(result).toEqual({ accessToken: 'new-access-token' });
  });
});
