import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { ZodPipe } from '../common/zod.pipe';
import { BusinessesService } from '../businesses/businesses.service';

const CreateSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do negócio').max(80),
  segment: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  allowedOrigins: z.array(z.string().max(200)).max(10).optional(),
  owner: z.object({
    name: z.string().trim().min(2, 'Informe o nome do responsável').max(80),
    email: z.string().trim().email('E-mail do responsável inválido'),
    password: z.string().min(8, 'A senha inicial precisa ter pelo menos 8 caracteres'),
  }),
});

/** Rotas da equipe Jarvis. */
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly businesses: BusinessesService) {}

  @Post('businesses')
  create(@Body(new ZodPipe(CreateSchema)) body: z.infer<typeof CreateSchema>) {
    return this.businesses.createWithOwner(body);
  }
}
