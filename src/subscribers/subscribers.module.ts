// subscribers/subscribers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscriber } from './entities/subscriber.entity';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';
import { SubscriberRepository } from './subscriber.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscriber]),
  ],
  controllers: [SubscribersController],
  providers: [
    SubscribersService,
    SubscriberRepository,
  ],
  exports: [
    SubscribersService,
    SubscriberRepository,
  ],
})
export class SubscribersModule {}
