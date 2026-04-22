// click-stats/entities/click-event.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('click_events')
@Index([
  'organizationId',
  'campaignId',
  'occurredAt',
])
@Index(['subscriberId', 'linkId'])
export class ClickEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Index()
  @Column({ type: 'uuid' })
  campaignId: string;

  @Column({ type: 'uuid' })
  subscriberId: string;

  @Column({ type: 'uuid' })
  linkId: string;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  originalUrl: string | null;

  @Column({ type: 'varchar', length: 64 })
  ipAddress: string;

  @Column({ type: 'varchar', length: 512 })
  userAgent: string;

  @Column({ type: 'varchar', length: 16 })
  eventType: string;

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
