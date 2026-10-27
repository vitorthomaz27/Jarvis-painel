import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, OwnerOnly } from '../common/decorators';
import type { AuthUser } from '../common/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { BusinessAccessGuard } from '../businesses/business-access.guard';
import { LeadsService } from './leads.service';

const Status = z.enum(['NOVO', 'CONVERSANDO', 'AGENDOU', 'CLIENTE', 'PERDIDO']);

const ListQuery = z.object({
  view: z.enum(['todos', 'sem-resposta', 'retorno', 'reativar']).default('todos'),
  status: Status.optional(),
  q: z.string().max(80).optional(),
});

const optText = (max: number) => z.string().trim().max(max).nullable().optional();
const dateOrNull = z.union([z.string().datetime({ offset: true }), z.null()]).optional()
  .transform((v) => (v === undefined ? undefined : v === null ? null : new Date(v)));

const CreateSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(120),
  phone: optText(30),
  email: z.union([z.string().trim().email('E-mail inválido'), z.literal(''), z.null()]).optional(),
  interest: optText(120),
  message: optText(2000),
  status: Status.optional(),
  followUpAt: dateOrNull,
});

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: optText(30),
  email: z.union([z.string().trim().email('E-mail inválido'), z.literal(''), z.null()]).optional(),
  interest: optText(120),
  status: Status.optional(),
  followUpAt: dateOrNull,
});

const NoteSchema = z.object({ body: z.string().trim().min(1, 'Escreva a nota').max(4000) });
const ContactSchema = z.object({ channel: z.enum(['WhatsApp', 'telefone', 'e-mail', 'presencial']).default('WhatsApp') }).default({});

@UseGuards(BusinessAccessGuard)
@Controller('businesses/:businessId/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Param('businessId') bid: string, @Query(new ZodPipe(ListQuery)) q: z.infer<typeof ListQuery>) {
    return this.leads.list(bid, q);
  }

  @Post()
  create(@Param('businessId') bid: string, @CurrentUser() user: AuthUser, @Body(new ZodPipe(CreateSchema)) body: z.infer<typeof CreateSchema>) {
    return this.leads.create(bid, user.id, { ...body, source: 'MANUAL' });
  }

  @Get(':leadId')
  get(@Param('businessId') bid: string, @Param('leadId') id: string) {
    return this.leads.get(bid, id);
  }

  @Patch(':leadId')
  update(@Param('businessId') bid: string, @Param('leadId') id: string, @CurrentUser() user: AuthUser, @Body(new ZodPipe(UpdateSchema)) body: z.infer<typeof UpdateSchema>) {
    return this.leads.update(bid, id, user.id, body);
  }

  @Post(':leadId/notes')
  note(@Param('businessId') bid: string, @Param('leadId') id: string, @CurrentUser() user: AuthUser, @Body(new ZodPipe(NoteSchema)) body: z.infer<typeof NoteSchema>) {
    return this.leads.addNote(bid, id, user.id, body.body);
  }

  @Post(':leadId/contact')
  @HttpCode(200)
  contact(@Param('businessId') bid: string, @Param('leadId') id: string, @CurrentUser() user: AuthUser, @Body(new ZodPipe(ContactSchema)) body: z.infer<typeof ContactSchema>) {
    return this.leads.registerContact(bid, id, user.id, body.channel);
  }

  @OwnerOnly()
  @Delete(':leadId')
  remove(@Param('businessId') bid: string, @Param('leadId') id: string) {
    return this.leads.remove(bid, id);
  }
}
