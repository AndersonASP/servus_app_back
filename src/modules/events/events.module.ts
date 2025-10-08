import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event, EventSchema } from './schemas/event.schema';
import {
  EventInstance,
  EventInstanceSchema,
} from './schemas/event-instance.schema';
import {
  EventException,
  EventExceptionSchema,
} from './schemas/event-exception.schema';
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: EventInstance.name, schema: EventInstanceSchema },
      { name: EventException.name, schema: EventExceptionSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
