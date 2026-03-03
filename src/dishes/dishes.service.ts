import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { PrismaError } from '../database/prisma-error.enum';
import { DishNotFoundException } from './dish-not-found.exception';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@Injectable()
export class DishesService {
  constructor(private readonly prismaService: PrismaService) {}

  create(restaurantId: number, dish: CreateDishDto) {
    return this.prismaService.dish.create({
      data: {
        ...dish,
        restaurantId,
      },
    });
  }

  getAllForRestaurant(restaurantId: number) {
    return this.prismaService.dish.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getById(restaurantId: number, dishId: number) {
    const dish = await this.prismaService.dish.findUnique({
      where: {
        id: dishId,
      },
    });

    if (!dish) {
      throw new DishNotFoundException(dishId);
    }

    if (dish.restaurantId !== restaurantId) {
      throw new ForbiddenException();
    }

    return dish;
  }

  async delete(restaurantId: number, dishId: number) {
    await this.getById(restaurantId, dishId);

    try {
      return await this.prismaService.dish.delete({
        where: {
          id: dishId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new DishNotFoundException(dishId);
      }
      throw error;
    }
  }

  async update(restaurantId: number, dishId: number, dish: UpdateDishDto) {
    await this.getById(restaurantId, dishId);

    try {
      return await this.prismaService.dish.update({
        data: {
          ...dish,
        },
        where: {
          id: dishId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new DishNotFoundException(dishId);
      }
      throw error;
    }
  }
}
