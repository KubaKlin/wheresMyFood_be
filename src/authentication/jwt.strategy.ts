import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { TokenPayload } from './token-payload.interface';
import { UsersService } from '../users/users.service';
import { UserType } from './user-type.enum';

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
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.subjectType === UserType.User) {
      const user = await this.usersService.getById(payload.subjectId);
      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        id: user.restaurantId,
        userId: user.id,
        restaurantId: user.restaurantId,
        type: UserType.User,
      };
    }

    const restaurant = await this.restaurantsService.getById(payload.subjectId);
    const { password, ...safeRestaurant } = restaurant;
    return {
      ...safeRestaurant,
      id: restaurant.id,
      restaurantId: restaurant.id,
      type: UserType.Restaurant,
    };
  }
}
