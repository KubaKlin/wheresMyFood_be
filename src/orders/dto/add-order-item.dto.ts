import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class AddOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  dishId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
