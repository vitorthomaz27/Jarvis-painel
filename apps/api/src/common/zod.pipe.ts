import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

/** Valida o corpo/query com um schema zod e devolve mensagens legíveis. */
export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message));
      throw new BadRequestException({ message: issues[0] ?? 'Dados inválidos', issues });
    }
    return parsed.data;
  }
}
