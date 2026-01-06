import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateDishDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  price: number;
}
