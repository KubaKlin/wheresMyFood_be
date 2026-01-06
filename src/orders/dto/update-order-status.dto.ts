import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ORDER_STATUSES, type OrderStatus } from '../order-status.type';

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;
}
