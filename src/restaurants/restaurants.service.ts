import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';
import { SignUpDto } from '../authentication/dto/sign-up.dto';
import type { RequestWithUser } from '../authentication/request-with-user';
import { generateInviteCode } from '../utilities/generate-invite-code';

type RestaurantInviteInfo = {
  inviteCode: string | null;
  inviteUrl: string | null;
};

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  private static readonly INVITE_CODE_TTL_MS = 60 * 60 * 1000; // 1 hour

  private getInviteCodeExpiresAt() {
    return new Date(Date.now() + RestaurantsService.INVITE_CODE_TTL_MS);
  }

  private isInviteCodeExpired(inviteCodeExpiresAt: Date | null | undefined) {
    if (!inviteCodeExpiresAt) {
      return true;
    }
    return inviteCodeExpiresAt.getTime() <= Date.now();
  }

  private assertRestaurantOwnerAccess(
    restaurantId: number,
    user: RequestWithUser['user'],
  ) {
    if (user.type !== 'restaurant' || user.id !== restaurantId) {
      throw new ForbiddenException();
    }
  }

  private buildInviteInfo(inviteCode: string | null): RestaurantInviteInfo {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl || !inviteCode) {
      return { inviteCode, inviteUrl: null };
    }

    return {
      inviteCode,
      inviteUrl: `${frontendUrl}/sign-up?inviteCode=${encodeURIComponent(inviteCode)}`,
    };
  }

  async createAccount(signUpData: SignUpDto) {
    const saltRounds = 10;
    const hashedPassword = await hash(signUpData.password, saltRounds);

    try {
      return await this.prismaService.restaurant.create({
        data: {
          email: signUpData.email,
          name: signUpData.name,
          password: hashedPassword,
          inviteCode: generateInviteCode(),
          inviteCodeExpiresAt: this.getInviteCodeExpiresAt(),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PrismaError.UniqueConstraintFailed
      ) {
        throw new ConflictException(
          'Restaurant with that email already exists',
        );
      }
      throw error;
    }
  }

  async getByEmail(email: string) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: {
        email,
      },
    });
    if (!restaurant) {
      throw new NotFoundException();
    }

    return restaurant;
  }

  async getById(id: number) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: {
        id,
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with id ${id} not found`);
    }

    return restaurant;
  }

  async getInviteInfo(restaurantId: number, user: RequestWithUser['user']) {
    this.assertRestaurantOwnerAccess(restaurantId, user);

    const restaurant = await this.getById(restaurantId);
    return this.buildInviteInfo(restaurant.inviteCode);
  }

  async getByInviteCode(inviteCode: string) {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { inviteCode },
    });
    if (
      !restaurant ||
      this.isInviteCodeExpired(restaurant.inviteCodeExpiresAt)
    ) {
      throw new NotFoundException('Invalid invite code');
    }
    return restaurant;
  }

  async refreshInviteCode(restaurantId: number) {
    return this.prismaService.restaurant.update({
      where: { id: restaurantId },
      data: {
        inviteCode: generateInviteCode(),
        inviteCodeExpiresAt: this.getInviteCodeExpiresAt(),
      },
    });
  }

  async refreshInviteInfo(restaurantId: number, user: RequestWithUser['user']) {
    this.assertRestaurantOwnerAccess(restaurantId, user);

    const restaurant = await this.refreshInviteCode(restaurantId);
    return this.buildInviteInfo(restaurant.inviteCode);
  }
}
