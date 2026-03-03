import { NotFoundException } from '@nestjs/common';

export class DishNotFoundException extends NotFoundException {
  constructor(dishId: number) {
    super(`Dish with ID ${dishId} not found`);
  }
}
