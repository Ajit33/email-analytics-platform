// subscribers/entities/subscriber.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { List } from '../../lists/entities/list.entity';

export enum SubscriberStatus {
  ACTIVE = 'active',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
}

@Entity('subscribers')
@Unique(['email', 'organizationId', 'listId'])
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 255 })
  email: string;

  @Column({ length: 255 })
  fullName: string;

  @Column({
    type: 'enum',
    enum: SubscriberStatus,
    default: SubscriberStatus.ACTIVE,
  })
  status: SubscriberStatus;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(
    () => Organization,
    (org) => org.subscribers,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  listId: string;

  @ManyToOne(
    () => List,
    (list) => list.subscribers,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'listId' })
  list: List;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
