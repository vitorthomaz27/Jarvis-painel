import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminController } from './admin.controller';

@Module({ imports: [BusinessesModule], controllers: [AdminController] })
export class AdminModule {}
