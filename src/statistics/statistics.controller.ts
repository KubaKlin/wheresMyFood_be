import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import type { RequestWithUser } from '../authentication/request-with-user';
import {
  STATISTICS_RANGES,
  type StatisticsRange,
} from './dto/statistics-range.dto';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @UseGuards(JwtAuthenticationGuard)
  @Get('top-dishes')
  getTopDishes(
    @Req() request: RequestWithUser,
    @Query('range') range: StatisticsRange,
  ) {
    const safeRange = STATISTICS_RANGES.includes(range) ? range : 'today';
    return this.statisticsService.getTopOrderedDishes(
      request.user.id,
      safeRange,
    );
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('orders-completed')
  getOrdersCompleted(
    @Req() request: RequestWithUser,
    @Query('range') range: StatisticsRange,
  ) {
    const safeRange = STATISTICS_RANGES.includes(range) ? range : 'today';
    return this.statisticsService.getCompletedOrdersCount(
      request.user.id,
      safeRange,
    );
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('money-earned')
  async getMoneyEarned(
    @Req() request: RequestWithUser,
    @Query('range') range: StatisticsRange,
  ) {
    const safeRange = STATISTICS_RANGES.includes(range) ? range : 'today';
    return {
      moneyEarned: await this.statisticsService.getMoneyEarned(
        request.user.id,
        safeRange,
      ),
    };
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('overview')
  getOverview(@Req() request: RequestWithUser) {
    return this.statisticsService.getOverview(request.user.id);
  }
}
