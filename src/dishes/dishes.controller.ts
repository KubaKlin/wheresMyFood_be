import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import type { RequestWithUser } from '../authentication/request-with-user';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { DishesService } from './dishes.service';

@Controller('dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @UseGuards(JwtAuthenticationGuard)
  @Post()
  create(@Req() request: RequestWithUser, @Body() dish: CreateDishDto) {
    return this.dishesService.create(request.user.id, dish);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  getAll(@Req() request: RequestWithUser) {
    return this.dishesService.getAllForRestaurant(request.user.id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get(':id')
  getById(@Req() request: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.dishesService.getById(request.user.id, id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Delete(':id')
  async delete(@Req() request: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    await this.dishesService.delete(request.user.id, id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Patch(':id')
  update(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dish: UpdateDishDto,
  ) {
    return this.dishesService.update(request.user.id, id, dish);
  }
}
