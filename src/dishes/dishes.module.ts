import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DishesController],
  providers: [DishesService],
  exports: [DishesService],
})
export class DishesModule {}
