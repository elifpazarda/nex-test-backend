import { Module } from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { GenerationsController } from './generations.controller';

@Module({
  providers: [GenerationsService],
  controllers: [GenerationsController],
  exports: [GenerationsService],
})
export class GenerationsModule {}
