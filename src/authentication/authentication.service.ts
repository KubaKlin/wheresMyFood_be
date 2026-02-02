import { Injectable, NotFoundException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LogInDto } from './dto/log-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { TokenPayload } from './token-payload.interface';
import { WrongCredentialsException } from './wrong-credentials.exception';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { UsersService } from '../users/users.service';
import { UserSignUpDto } from './dto/user-sign-up.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signUp(signUpData: SignUpDto) {
    const restaurant = await this.restaurantsService.createAccount(signUpData);
    const { password, inviteCodeExpiresAt, ...safeRestaurant } = restaurant;
    return safeRestaurant;
  }

  async signUpUser(signUpData: UserSignUpDto) {
    const restaurant = await this.restaurantsService.getByInviteCode(
      signUpData.inviteCode,
    );

    const user = await this.usersService.createForRestaurant({
      email: signUpData.email,
      name: signUpData.name,
      password: signUpData.password,
      restaurantId: restaurant.id,
    });

    const { password, ...safeUser } = user;
    return safeUser;
  }

  private async getRestaurantByEmail(email: string) {
    try {
      return await this.restaurantsService.getByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new WrongCredentialsException();
      }
      throw error;
    }
  }

  private async getUserByEmail(email: string) {
    try {
      return await this.usersService.getByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new WrongCredentialsException();
      }
      throw error;
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await compare(plainTextPassword, hashedPassword);
    if (!isPasswordMatching) {
      throw new WrongCredentialsException();
    }
  }

  async getAuthenticatedUser(logInData: LogInDto) {
    const restaurant = await this.getRestaurantByEmail(logInData.email);
    await this.verifyPassword(logInData.password, restaurant.password);
    const { password, ...safeRestaurant } = restaurant;
    return safeRestaurant;
  }

  async getAuthenticatedRestaurantUser(logInData: LogInDto) {
    const user = await this.getUserByEmail(logInData.email);
    await this.verifyPassword(logInData.password, user.password);
    const { password, ...safeUser } = user;
    return safeUser;
  }

  getCookieWithJwtToken(
    subjectId: number,
    subjectType: TokenPayload['subjectType'] = 'restaurant',
  ) {
    const payload: TokenPayload = { subjectId, subjectType };
    const token = this.jwtService.sign(payload);
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get(
      'JWT_EXPIRATION_TIME',
    )}`;
  }

  getCookieForLogOut() {
    return `Authentication=; HttpOnly; Path=/; Max-Age=0`;
  }
}
