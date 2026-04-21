// lists/entities/list.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('lists')
@Index(['organizationId', 'name'], {
  unique: true,
})
export class List {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(
    () => Organization,
    (org) => org.lists,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => Subscriber, (sub) => sub.list)
  subscribers: Subscriber[];

  @OneToMany(
    () => Campaign,
    (campaign) => campaign.list,
  )
  campaigns: Campaign[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
