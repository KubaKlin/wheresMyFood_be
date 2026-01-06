import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaService } from '../database/prisma.service';
import { SignUpDto } from '../authentication/dto/sign-up.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createAccount(signUpData: SignUpDto) {
    const saltRounds = 10;
    const hashedPassword = await hash(signUpData.password, saltRounds);

    try {
      return await this.prismaService.restaurant.create({
        data: {
          email: signUpData.email,
          name: signUpData.name,
          password: hashedPassword,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PrismaError.UniqueConstraintFailed
      ) {
        throw new ConflictException('Restaurant with that email already exists');
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
}


