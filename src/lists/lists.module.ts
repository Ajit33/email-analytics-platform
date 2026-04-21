// lists/lists.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListController } from './lists.controller';
import { ListService } from './lists.service';
import { ListRepository } from './lists.repository';
import { List } from './entities/list.entity';
import { SubscribersModule } from '../subscribers/subscribers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([List]),
    SubscribersModule,
  ],
  controllers: [ListController],
  providers: [ListService, ListRepository],
  exports: [ListService, ListRepository],
})
export class ListsModule {}
