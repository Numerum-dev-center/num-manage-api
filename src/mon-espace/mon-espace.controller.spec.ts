// mon-espace.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { MonEspaceController } from './mon-espace.controller';
import { PromotionsService } from '../promotions/promotions.service';
import { Promotion } from '../promotions/entities/promotion.entity';
import { User } from '../users/entities/user.entity';

describe('MonEspaceController', () => {
  let controller: MonEspaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonEspaceController],
      providers: [
        PromotionsService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<MonEspaceController>(MonEspaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
