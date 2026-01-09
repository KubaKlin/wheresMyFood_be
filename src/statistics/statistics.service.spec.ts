import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { StatisticsService } from './statistics.service';

describe('The StatisticsService', () => {
  let statisticsService: StatisticsService;

  let groupByMock: jest.Mock;
  let dishFindManyMock: jest.Mock;
  let orderCountMock: jest.Mock;

  beforeEach(async () => {
    groupByMock = jest.fn();
    dishFindManyMock = jest.fn();
    orderCountMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: PrismaService,
          useValue: {
            orderItem: {
              groupBy: groupByMock,
            },
            dish: {
              findMany: dishFindManyMock,
            },
            order: {
              count: orderCountMock,
            },
          },
        },
      ],
    }).compile();

    statisticsService = await module.get(StatisticsService);
  });

  describe('when getTopOrderedDishes is called', () => {
    describe('and there are no results', () => {
      beforeEach(() => {
        groupByMock.mockResolvedValue([]);
      });

      it('should return empty list', async () => {
        const result = await statisticsService.getTopOrderedDishes(1, 'today');
        expect(result).toEqual([]);
      });
    });

    describe('and results exist', () => {
      beforeEach(() => {
        groupByMock.mockResolvedValue([
          { dishId: 1, _sum: { quantity: 5 } },
          { dishId: 2, _sum: { quantity: 3 } },
        ]);
        dishFindManyMock.mockResolvedValue([
          { id: 1, name: 'Pizza', price: 3500 },
          { id: 2, name: 'Pasta', price: 2900 },
        ]);
      });

      it('should map quantities onto dishes', async () => {
        const result = await statisticsService.getTopOrderedDishes(1, '7d');
        expect(result).toEqual([
          { dishId: 1, name: 'Pizza', price: 3500, quantity: 5 },
          { dishId: 2, name: 'Pasta', price: 2900, quantity: 3 },
        ]);
      });
    });
  });

  describe('when getCompletedOrdersCount is called', () => {
    beforeEach(() => {
      orderCountMock.mockResolvedValue(7);
    });

    it('should return prisma count', async () => {
      const result = await statisticsService.getCompletedOrdersCount(1, '30d');
      expect(result).toBe(7);
    });
  });

  describe('when getMoneyEarned is called', () => {
    describe('and there are no items', () => {
      beforeEach(() => {
        groupByMock.mockResolvedValue([]);
      });

      it('should return 0', async () => {
        const result = await statisticsService.getMoneyEarned(1, 'today');
        expect(result).toBe(0);
      });
    });

    describe('and items exist', () => {
      beforeEach(() => {
        groupByMock.mockResolvedValue([
          { dishId: 1, _sum: { quantity: 2 } },
          { dishId: 2, _sum: { quantity: 1 } },
        ]);
        dishFindManyMock.mockResolvedValue([
          { id: 1, price: 3500 },
          { id: 2, price: 2900 },
        ]);
      });

      it('should sum price * quantity', async () => {
        const result = await statisticsService.getMoneyEarned(1, '7d');
        expect(result).toBe(3500 * 2 + 2900 * 1);
      });
    });
  });
});
