import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { TokenPayload } from './token-payload.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.Authentication;
        },
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.subjectType === 'user') {
      const user = await this.usersService.getById(payload.subjectId);
      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        id: user.restaurantId,
        userId: user.id,
        restaurantId: user.restaurantId,
        type: 'user' as const,
      };
    }

    const restaurant = await this.restaurantsService.getById(payload.subjectId);
    const { password, ...safeRestaurant } = restaurant;
    return {
      ...safeRestaurant,
      id: restaurant.id,
      restaurantId: restaurant.id,
      type: 'restaurant' as const,
    };
  }
}
