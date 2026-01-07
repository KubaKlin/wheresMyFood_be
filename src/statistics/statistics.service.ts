import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { StatisticsRange } from './dto/statistics-range.dto';

type TopDish = {
  dishId: number;
  name: string;
  price: number;
  quantity: number;
};

@Injectable()
export class StatisticsService {
  constructor(private readonly prismaService: PrismaService) {}

  private getRangeStart(range: StatisticsRange) {
    const now = new Date();

    if (range === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    const days = range === '7d' ? 7 : 30;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return start;
  }

  async getTopOrderedDishes(restaurantId: number, range: StatisticsRange) {
    const start = this.getRangeStart(range);

    const grouped = await this.prismaService.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          restaurantId,
          status: 'READY_TO_TAKE',
          updatedAt: {
            gte: start,
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 3,
    });

    const dishIds = grouped.map((group) => group.dishId);
    if (dishIds.length === 0) {
      return [] as TopDish[];
    }

    const dishes = await this.prismaService.dish.findMany({
      where: {
        id: {
          in: dishIds,
        },
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const dishById = new Map(dishes.map((dish) => [dish.id, dish]));

    return grouped
      .map((group) => {
        const dish = dishById.get(group.dishId);
        if (!dish) {
          return null;
        }
        return {
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: group._sum.quantity ?? 0,
        } satisfies TopDish;
      })
      .filter((x): x is TopDish => x !== null);
  }

  getCompletedOrdersCount(restaurantId: number, range: StatisticsRange) {
    const start = this.getRangeStart(range);
    return this.prismaService.order.count({
      where: {
        restaurantId,
        status: 'READY_TO_TAKE',
        updatedAt: {
          gte: start,
        },
      },
    });
  }

  async getMoneyEarned(restaurantId: number, range: StatisticsRange) {
    const start = this.getRangeStart(range);

    const grouped = await this.prismaService.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          restaurantId,
          status: 'READY_TO_TAKE',
          updatedAt: {
            gte: start,
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const dishIds = grouped.map((group) => group.dishId);
    if (dishIds.length === 0) {
      return 0;
    }

    const dishes = await this.prismaService.dish.findMany({
      where: {
        id: {
          in: dishIds,
        },
        restaurantId,
      },
      select: {
        id: true,
        price: true,
      },
    });

    const priceById = new Map(dishes.map((dish) => [dish.id, dish.price]));

    return grouped.reduce((sum, group) => {
      const price = priceById.get(group.dishId) ?? 0;
      const qty = group._sum.quantity ?? 0;
      return sum + price * qty;
    }, 0);
  }

  async getOverview(restaurantId: number) {
    const ranges: StatisticsRange[] = ['today', '7d', '30d'];

    const entries = await Promise.all(
      ranges.map(async (range) => {
        const [topDishes, completedOrders, moneyEarned] = await Promise.all([
          this.getTopOrderedDishes(restaurantId, range),
          this.getCompletedOrdersCount(restaurantId, range),
          this.getMoneyEarned(restaurantId, range),
        ]);

        return [
          range,
          {
            topDishes,
            completedOrders,
            moneyEarned,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(entries);
  }
}
