import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { CanBeUndefined } from '../../utilities/can-be-undefined';

export class UpdateDishDto {
  @IsOptional()
  @CanBeUndefined()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @CanBeUndefined()
  @IsInt()
  @Min(0)
  price: number;
}
