import { Module } from '@nestjs/common';
import { CaptureService } from './capture.service';
import { PublicController } from './public.controller';

@Module({ controllers: [PublicController], providers: [CaptureService] })
export class PublicModule {}
