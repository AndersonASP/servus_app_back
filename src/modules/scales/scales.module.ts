import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScalesController } from './scales.controller';
import { ScalesService } from './scales.service';
import { Scale, ScaleSchema } from './schemas/scale.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Scale.name, schema: ScaleSchema },
    ]),
  ],
  controllers: [ScalesController],
  providers: [ScalesService],
  exports: [ScalesService],
})
export class ScalesModule {}
