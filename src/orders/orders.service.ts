import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { PrismaError } from '../database/prisma-error.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderNotFoundException } from './order-not-found.exception';
import { OrderStatus } from './order-status.type';
import { DishNotFoundException } from '../dishes/dish-not-found.exception';

type OrderForClient = {
  id: number;
  name: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  additionalInfo: string | null;
  items: Array<{
    id: number;
    quantity: number;
    dish: {
      id: number;
      name: string;
      price: number;
    };
  }>;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  create(restaurantId: number, createOrderDto: CreateOrderDto) {
    return this.prismaService.order.create({
      data: {
        name: createOrderDto.name,
        additionalInfo: createOrderDto.additionalInfo,
        restaurantId,
        status: 'IN_PROGRESS',
      },
    });
  }

  getCurrentForRestaurant(restaurantId: number) {
    return this.prismaService.order.findMany({
      where: {
        restaurantId,
        status: 'IN_PROGRESS',
      },
      include: {
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  getCompletedForRestaurant(restaurantId: number) {
    return this.prismaService.order.findMany({
      where: {
        restaurantId,
        status: 'READY_TO_TAKE',
      },
      include: {
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getClientStatus(orderId: number): Promise<OrderForClient> {
    const order = await this.prismaService.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        additionalInfo: true,
        items: {
          select: {
            id: true,
            quantity: true,
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    return order as OrderForClient;
  }

  async updateStatus(
    restaurantId: number,
    orderId: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    await this.assertOrderOwnership(restaurantId, orderId);

    try {
      return await this.prismaService.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: updateOrderStatusDto.status,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new OrderNotFoundException(orderId);
      }
      throw error;
    }
  }

  private async assertOrderOwnership(restaurantId: number, orderId: number) {
    const order = await this.prismaService.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    if (order.restaurantId !== restaurantId) {
      throw new ForbiddenException();
    }
  }

  async addDishToOrder(
    restaurantId: number,
    orderId: number,
    addOrderItemDto: AddOrderItemDto,
  ) {
    await this.assertOrderOwnership(restaurantId, orderId);

    const dish = await this.prismaService.dish.findUnique({
      where: {
        id: addOrderItemDto.dishId,
      },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!dish) {
      throw new DishNotFoundException(addOrderItemDto.dishId);
    }

    const quantityToAdd = addOrderItemDto.quantity ?? 1;

    return this.prismaService.orderItem.upsert({
      where: {
        orderId_dishId: {
          orderId,
          dishId: addOrderItemDto.dishId,
        },
      },
      create: {
        orderId,
        dishId: addOrderItemDto.dishId,
        quantity: quantityToAdd,
      },
      update: {
        quantity: {
          increment: quantityToAdd,
        },
      },
      include: {
        dish: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }

  async getOrderItemsForRestaurant(restaurantId: number, orderId: number) {
    await this.assertOrderOwnership(restaurantId, orderId);

    return this.prismaService.orderItem.findMany({
      where: {
        orderId,
      },
      include: {
        dish: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  getOrderStatusUrl(orderId: number) {
    const baseUrl =
      this.configService.get<string>('PUBLIC_APP_URL') ??
      this.configService.get<string>('FRONTEND_URL');
    return `${baseUrl}/orders/${orderId}`;
  }

  async getQrPayloadForOrder(restaurantId: number, orderId: number) {
    await this.assertOrderOwnership(restaurantId, orderId);
    const statusUrl = this.getOrderStatusUrl(orderId);
    return {
      orderId,
      statusUrl,
      qrPayload: statusUrl,
    };
  }
}
