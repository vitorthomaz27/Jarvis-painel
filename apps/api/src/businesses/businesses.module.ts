import { Module } from '@nestjs/common';
import { BusinessAccessGuard } from './business-access.guard';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessAccessGuard],
  exports: [BusinessesService, BusinessAccessGuard],
})
export class BusinessesModule {}
