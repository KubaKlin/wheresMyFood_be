import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';

export type CreateRestaurantUserInput = {
  email: string;
  name: string;
  password: string;
  restaurantId: number;
};

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createForRestaurant(input: CreateRestaurantUserInput) {
    const saltRounds = 10;
    const hashedPassword = await hash(input.password, saltRounds);

    try {
      return await this.prismaService.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          restaurantId: input.restaurantId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PrismaError.UniqueConstraintFailed
      ) {
        throw new ConflictException('User with that email already exists');
      }
      throw error;
    }
  }

  async getByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async getById(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}
