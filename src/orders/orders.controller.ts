import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import type { RequestWithUser } from '../authentication/request-with-user';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthenticationGuard)
  @Post()
  async create(
    @Req() request: RequestWithUser,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(request.user.id, createOrderDto);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('current')
  async getCurrent(@Req() request: RequestWithUser) {
    return this.ordersService.getCurrentForRestaurant(request.user.id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('archived')
  async getArchived(@Req() request: RequestWithUser) {
    return this.ordersService.getArchivedForRestaurant(request.user.id);
  }

  // Public endpoint for client website after scanning QR
  @Get(':id/status')
  async getClientStatus(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getClientStatus(id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get(':id/qr')
  async getQrPayload(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getQrPayloadForOrder(request.user.id, id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @HttpCode(200)
  @Patch(':id/status')
  async updateStatus(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      request.user.id,
      id,
      updateOrderStatusDto,
    );
  }
}


