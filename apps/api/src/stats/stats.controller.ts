import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { RULES } from '../common/rules';
import { BusinessAccessGuard } from '../businesses/business-access.guard';
import { StatsService } from './stats.service';

const Query_ = z.object({ days: z.coerce.number().int().min(1).max(365).default(RULES.periodoDias) });

@UseGuards(BusinessAccessGuard)
@Controller('businesses/:businessId/overview')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  overview(@Param('businessId') bid: string, @Query(new ZodPipe(Query_)) q: z.infer<typeof Query_>) {
    return this.stats.overview(bid, q.days);
  }
}
