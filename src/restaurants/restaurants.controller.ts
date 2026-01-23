import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import type { RequestWithUser } from '../authentication/request-with-user';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantsService.getById(id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get(':id/invite')
  async getInviteInfo(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    if (request.user.type !== 'restaurant' || request.user.id !== id) {
      throw new ForbiddenException();
    }

    const restaurant = await this.restaurantsService.getById(id);
    const inviteCode = restaurant.inviteCode;
    return {
      inviteCode,
      inviteUrl: inviteCode
        ? `${process.env.FRONTEND_URL}/sign-up?inviteCode=${inviteCode}`
        : null,
    };
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post(':id/invite/refresh')
  async refreshInviteCode(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    if (request.user.type !== 'restaurant' || request.user.id !== id) {
      throw new ForbiddenException();
    }

    const restaurant = await this.restaurantsService.refreshInviteCode(id);
    const inviteCode = restaurant.inviteCode;
    return {
      inviteCode,
      inviteUrl: inviteCode
        ? `${process.env.FRONTEND_URL}/sign-up?inviteCode=${inviteCode}`
        : null,
    };
  }
}
