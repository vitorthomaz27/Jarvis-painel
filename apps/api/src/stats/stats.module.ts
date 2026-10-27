import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({ imports: [BusinessesModule], controllers: [StatsController], providers: [StatsService] })
export class StatsModule {}
