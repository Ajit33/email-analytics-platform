// organizations/entities/organization.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { List } from '../../lists/entities/list.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  name: string;

  @OneToMany(
    () => User,
    (user) => user.organization,
  )
  users: User[];

  @OneToMany(
    () => List,
    (list) => list.organization,
  )
  lists: List[];

  @OneToMany(
    () => Subscriber,
    (sub) => sub.organization,
  )
  subscribers: Subscriber[];

  @OneToMany(
    () => Campaign,
    (campaign) => campaign.organization,
  )
  campaigns: Campaign[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
