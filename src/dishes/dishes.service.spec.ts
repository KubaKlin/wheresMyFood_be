import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';
import { DishNotFoundException } from './dish-not-found.exception';
import { DishesService } from './dishes.service';

describe('The DishesService', () => {
  let dishesService: DishesService;

  let dishCreateMock: jest.Mock;
  let dishFindManyMock: jest.Mock;
  let dishFindUniqueMock: jest.Mock;
  let dishDeleteMock: jest.Mock;
  let dishUpdateMock: jest.Mock;

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    });
  };

  beforeEach(async () => {
    dishCreateMock = jest.fn();
    dishFindManyMock = jest.fn();
    dishFindUniqueMock = jest.fn();
    dishDeleteMock = jest.fn();
    dishUpdateMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        DishesService,
        {
          provide: PrismaService,
          useValue: {
            dish: {
              create: dishCreateMock,
              findMany: dishFindManyMock,
              findUnique: dishFindUniqueMock,
              delete: dishDeleteMock,
              update: dishUpdateMock,
            },
          },
        },
      ],
    }).compile();

    dishesService = await module.get(DishesService);
  });

  describe('when create is called', () => {
    it('should add restaurantId and call prisma.dish.create', async () => {
      dishCreateMock.mockResolvedValue({ id: 1 });

      await dishesService.create(10, { name: 'Pizza', price: 3500 });

      expect(dishCreateMock).toHaveBeenCalledWith({
        data: {
          name: 'Pizza',
          price: 3500,
          restaurantId: 10,
        },
      });
    });
  });

  describe('when getAllForRestaurant is called', () => {
    it('should call prisma.dish.findMany', async () => {
      dishFindManyMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await dishesService.getAllForRestaurant(1);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('when getById is called', () => {
    describe('and dish exists and belongs to restaurant', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
      });

      it('should return dish', async () => {
        const result = await dishesService.getById(1, 1);
        expect(result).toEqual({ id: 1, restaurantId: 1 });
      });
    });

    describe('and dish does not exist', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw DishNotFoundException', async () => {
        return expect(async () => {
          await dishesService.getById(1, 999);
        }).rejects.toThrow(DishNotFoundException);
      });
    });

    describe('and dish belongs to another restaurant', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 2 });
      });

      it('should throw ForbiddenException', async () => {
        return expect(async () => {
          await dishesService.getById(1, 1);
        }).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('when delete is called', () => {
    describe('and dish exists and prisma deletes', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        dishDeleteMock.mockResolvedValue({ id: 1 });
      });

      it('should delete dish', async () => {
        const result = await dishesService.delete(1, 1);
        expect(result).toEqual({ id: 1 });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        dishDeleteMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw DishNotFoundException', async () => {
        return expect(async () => {
          await dishesService.delete(1, 1);
        }).rejects.toThrow(DishNotFoundException);
      });
    });
  });

  describe('when update is called', () => {
    describe('and dish exists and prisma updates', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        dishUpdateMock.mockResolvedValue({ id: 1, price: 4000 });
      });

      it('should update dish', async () => {
        const result = await dishesService.update(1, 1, {
          name: 'Pizza',
          price: 4000,
        });
        expect(result).toEqual({ id: 1, price: 4000 });
      });
    });

    describe('and prisma throws RecordDoesNotExist', () => {
      beforeEach(() => {
        dishFindUniqueMock.mockResolvedValue({ id: 1, restaurantId: 1 });
        dishUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should throw DishNotFoundException', async () => {
        return expect(async () => {
          await dishesService.update(1, 1, { name: 'Pizza', price: 4000 });
        }).rejects.toThrow(DishNotFoundException);
      });
    });
  });
});
