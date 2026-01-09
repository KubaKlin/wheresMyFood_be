import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';
import { DishNotFoundException } from '../dishes/dish-not-found.exception';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderNotFoundException } from './order-not-found.exception';
import { OrdersService } from './orders.service';

describe('The OrdersService', () => {
  let ordersService: OrdersService;

  let orderCreateMock: jest.Mock;
  let orderFindManyMock: jest.Mock;
  let orderFindUniqueMock: jest.Mock;
  let orderUpdateMock: jest.Mock;

  let dishFindUniqueMock: jest.Mock;
  let orderItemUpsertMock: jest.Mock;
  let orderItemFindManyMock: jest.Mock;

  let configGetMock: jest.Mock;

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    } as any);
  };

  beforeEach(async () => {
    orderCreateMock = jest.fn();
    orderFindManyMock = jest.fn();
    orderFindUniqueMock = jest.fn();
    orderUpdateMock = jest.fn();

    dishFindUniqueMock = jest.fn();
    orderItemUpsertMock = jest.fn();
    orderItemFindManyMock = jest.fn();

    configGetMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: orderCreateMock,
              findMany: orderFindManyMock,
              findUnique: orderFindUniqueMock,
              update: orderUpdateMock,
            },
            dish: {
              findUnique: dishFindUniqueMock,
            },
            orderItem: {
              upsert: orderItemUpsertMock,
              findMany: orderItemFindManyMock,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
      ],
    }).compile();

    ordersService = await module.get(OrdersService);
  });

  describe('when create is called', () => {
    it('should call prisma.order.create with mapped data', async () => {
      const dto: CreateOrderDto = {
        name: 'Table 5',
        additionalInfo: 'No onions',
      };

      orderCreateMock.mockResolvedValue({ id: 1 });

      await ordersService.create(10, dto);

      expect(orderCreateMock).toHaveBeenCalledWith({
        data: {
          name: 'Table 5',
          additionalInfo: 'No onions',
          restaurantId: 10,
          status: 'IN_PROGRESS',
        },
      });
    });
  });

  describe('when getCurrentForRestaurant is called', () => {
    it('should include items with dish in the query', async () => {
      orderFindManyMock.mockResolvedValue([{ id: 1 }]);
      const result = await ordersService.getCurrentForRestaurant(1);

      expect(orderFindManyMock).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('when getCompletedForRestaurant is called', () => {
    it('should include items with dish in the query', async () => {
      orderFindManyMock.mockResolvedValue([{ id: 2 }]);
      const result = await ordersService.getCompletedForRestaurant(1);

      expect(orderFindManyMock).toHaveBeenCalled();
      expect(result).toEqual([{ id: 2 }]);
    });
  });

  describe('when getClientStatus is called', () => {
    describe('and the order exists', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue({
          id: 1,
          name: 'Table 5',
          status: 'IN_PROGRESS',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          additionalInfo: null,
          items: [],
        });
      });

      it('should return the order status payload', async () => {
        const result = await ordersService.getClientStatus(1);
        expect(result.id).toBe(1);
      });
    });

    describe('and the order does not exist', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw OrderNotFoundException', async () => {
        return expect(async () => {
          await ordersService.getClientStatus(999);
        }).rejects.toThrow(OrderNotFoundException);
      });
    });
  });

  describe('when updateStatus is called', () => {
    const dto: UpdateOrderStatusDto = { status: 'READY_TO_TAKE' };

    describe('and the order belongs to the restaurant', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
      });

      it('should update status', async () => {
        orderUpdateMock.mockResolvedValue({ id: 1, status: 'READY_TO_TAKE' });
        const result = await ordersService.updateStatus(1, 1, dto);

        expect(orderUpdateMock).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { status: 'READY_TO_TAKE' },
        });
        expect(result).toEqual({ id: 1, status: 'READY_TO_TAKE' });
      });
    });

    describe('and the order does not exist', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw OrderNotFoundException', async () => {
        return expect(async () => {
          await ordersService.updateStatus(1, 999, dto);
        }).rejects.toThrow(OrderNotFoundException);
      });
    });

    describe('and the order belongs to someone else', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 2 });
      });

      it('should throw ForbiddenException', async () => {
        return expect(async () => {
          await ordersService.updateStatus(1, 1, dto);
        }).rejects.toThrow(ForbiddenException);
      });
    });

    describe('and prisma throws RecordDoesNotExist on update', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        orderUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw OrderNotFoundException', async () => {
        return expect(async () => {
          await ordersService.updateStatus(1, 1, dto);
        }).rejects.toThrow(OrderNotFoundException);
      });
    });
  });

  describe('when addDishToOrder is called', () => {
    const dto: AddOrderItemDto = { dishId: 5, quantity: 2 };

    describe('and order is owned and dish exists', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        dishFindUniqueMock.mockResolvedValue({ id: 5, restaurantId: 1 });
        orderItemUpsertMock.mockResolvedValue({ id: 100 });
      });

      it('should upsert orderItem and increment quantity', async () => {
        await ordersService.addDishToOrder(1, 1, dto);

        expect(orderItemUpsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              orderId_dishId: { orderId: 1, dishId: 5 },
            },
            create: { orderId: 1, dishId: 5, quantity: 2 },
            update: { quantity: { increment: 2 } },
          }),
        );
      });
    });

    describe('and the dish does not exist', () => {
      beforeEach(() => {
        orderFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        dishFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw DishNotFoundException', async () => {
        return expect(async () => {
          await ordersService.addDishToOrder(1, 1, dto);
        }).rejects.toThrow(DishNotFoundException);
      });
    });
  });

  describe('when getOrderItemsForRestaurant is called', () => {
    beforeEach(() => {
      orderFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
      orderItemFindManyMock.mockResolvedValue([{ id: 1 }]);
    });

    it('should return order items', async () => {
      const result = await ordersService.getOrderItemsForRestaurant(1, 1);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('when getOrderStatusUrl is called', () => {
    it('should prefer PUBLIC_APP_URL over FRONTEND_URL', () => {
      configGetMock.mockImplementation((key: string) => {
        if (key === 'PUBLIC_APP_URL') return 'https://public.app';
        if (key === 'FRONTEND_URL') return 'https://frontend.app';
        return undefined;
      });

      expect(ordersService.getOrderStatusUrl(10)).toBe(
        'https://public.app/orders/10',
      );
    });

    it('should fallback to FRONTEND_URL', () => {
      configGetMock.mockImplementation((key: string) => {
        if (key === 'PUBLIC_APP_URL') return undefined;
        if (key === 'FRONTEND_URL') return 'https://frontend.app';
        return undefined;
      });

      expect(ordersService.getOrderStatusUrl(10)).toBe(
        'https://frontend.app/orders/10',
      );
    });
  });
});
