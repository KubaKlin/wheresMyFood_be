import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

describe('The StatisticsController', () => {
  let app: INestApplication;

  let getTopOrderedDishesMock: jest.Mock;
  let getCompletedOrdersCountMock: jest.Mock;
  let getMoneyEarnedMock: jest.Mock;
  let getOverviewMock: jest.Mock;

  beforeEach(async () => {
    getTopOrderedDishesMock = jest.fn();
    getCompletedOrdersCountMock = jest.fn();
    getMoneyEarnedMock = jest.fn();
    getOverviewMock = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: {
            getTopOrderedDishes: getTopOrderedDishesMock,
            getCompletedOrdersCount: getCompletedOrdersCountMock,
            getMoneyEarned: getMoneyEarnedMock,
            getOverview: getOverviewMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({
        ...mockJwtAuthenticationGuard,
        canActivate: (context: ExecutionContext) =>
          mockJwtAuthenticationGuard.canActivate(context),
      })
      .compile();

    app = await createTestApp(module);
  });

  describe('when GET /statistics/top-dishes is called', () => {
    beforeEach(() => {
      getTopOrderedDishesMock.mockResolvedValue([{ dishId: 1, quantity: 3 }]);
    });

    it('should default to today when range is invalid', async () => {
      await request(app.getHttpServer())
        .get('/statistics/top-dishes?range=nope')
        .expect(200);

      expect(getTopOrderedDishesMock).toHaveBeenCalledWith(1, 'today');
    });
  });

  describe('when GET /statistics/orders-completed is called', () => {
    beforeEach(() => {
      getCompletedOrdersCountMock.mockResolvedValue(5);
    });

    it('should return number', async () => {
      const response = await request(app.getHttpServer())
        .get('/statistics/orders-completed?range=7d')
        .expect(200);

      expect(response.text).toBe('5');
    });
  });

  describe('when GET /statistics/money-earned is called', () => {
    beforeEach(() => {
      getMoneyEarnedMock.mockResolvedValue(12345);
    });

    it('should return object with moneyEarned', () => {
      return request(app.getHttpServer())
        .get('/statistics/money-earned?range=30d')
        .expect(200)
        .expect({ moneyEarned: 12345 });
    });
  });

  describe('when GET /statistics/overview is called', () => {
    beforeEach(() => {
      getOverviewMock.mockResolvedValue({ today: { completedOrders: 1 } });
    });

    it('should return overview', () => {
      return request(app.getHttpServer())
        .get('/statistics/overview')
        .expect(200)
        .expect({ today: { completedOrders: 1 } });
    });
  });

  describe('when the user is not authenticated', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [StatisticsController],
        providers: [
          {
            provide: StatisticsService,
            useValue: {
              getTopOrderedDishes: getTopOrderedDishesMock,
              getCompletedOrdersCount: getCompletedOrdersCountMock,
              getMoneyEarned: getMoneyEarnedMock,
              getOverview: getOverviewMock,
            },
          },
        ],
      })
        .overrideGuard(JwtAuthenticationGuard)
        .useValue({
          canActivate: () => {
            throw new UnauthorizedException();
          },
        })
        .compile();

      app = await createTestApp(module);
    });

    it('should respond with 401 for GET /statistics/overview', () => {
      return request(app.getHttpServer())
        .get('/statistics/overview')
        .expect(401);
    });

    it('should respond with 401 for GET /statistics/top-dishes', () => {
      return request(app.getHttpServer())
        .get('/statistics/top-dishes?range=today')
        .expect(401);
    });

    it('should respond with 401 for GET /statistics/orders-completed', () => {
      return request(app.getHttpServer())
        .get('/statistics/orders-completed?range=7d')
        .expect(401);
    });

    it('should respond with 401 for GET /statistics/money-earned', () => {
      return request(app.getHttpServer())
        .get('/statistics/money-earned?range=30d')
        .expect(401);
    });
  });
});
