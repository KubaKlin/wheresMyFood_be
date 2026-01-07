import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantsService.getById(id);
  }
}
