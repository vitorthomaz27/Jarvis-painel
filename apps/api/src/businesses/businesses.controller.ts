import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, OwnerOnly } from '../common/decorators';
import type { AuthUser } from '../common/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { BusinessAccessGuard } from './business-access.guard';
import { BusinessesService } from './businesses.service';

const UpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  segment: z.string().trim().max(60).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  allowedOrigins: z.array(z.string().max(200)).max(10).optional(),
});

const MemberSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(80),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
  role: z.enum(['OWNER', 'MEMBER']).default('MEMBER'),
});

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly svc: BusinessesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.listFor(user);
  }

  @UseGuards(BusinessAccessGuard)
  @Get(':businessId')
  get(@Param('businessId') id: string) {
    return this.svc.get(id);
  }

  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  @Patch(':businessId')
  update(@Param('businessId') id: string, @Body(new ZodPipe(UpdateSchema)) body: z.infer<typeof UpdateSchema>) {
    return this.svc.update(id, body);
  }

  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  @Post(':businessId/rotate-key')
  @HttpCode(200)
  rotate(@Param('businessId') id: string) {
    return this.svc.rotateKey(id);
  }

  @UseGuards(BusinessAccessGuard)
  @Get(':businessId/members')
  members(@Param('businessId') id: string) {
    return this.svc.members(id);
  }

  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  @Post(':businessId/members')
  addMember(@Param('businessId') id: string, @Body(new ZodPipe(MemberSchema)) body: z.infer<typeof MemberSchema>) {
    return this.svc.addMember(id, body);
  }

  @UseGuards(BusinessAccessGuard)
  @OwnerOnly()
  @Delete(':businessId/members/:userId')
  removeMember(@Param('businessId') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthUser) {
    return this.svc.removeMember(id, userId, user);
  }
}
