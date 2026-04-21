// campaigns/entities/campaign.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { List } from '../../lists/entities/list.entity';

// Removed: import ClickStat — campaign entity does not need to know
// about click stats. Stats are queried by campaignId directly from
// click_events table. No circular dependency, no deleted entity import.

export enum CampaignStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  subject: string;

  @Column('text')
  content: string;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  targetUrl: string | null;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ default: false })
  clickTrackingDisabled: boolean;

  @Column({ default: false })
  openTrackingDisabled: boolean;

  @Column({ default: 0 })
  openedCount: number;

  @Column({ default: 0 })
  sentCount: number;

  @Column({ default: 0 })
  totalRecipients: number;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(
    () => Organization,
    (org) => org.campaigns,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  listId: string;

  @ManyToOne(
    () => List,
    (list) => list.campaigns,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'listId' })
  list: List;

  // Removed: @OneToMany(() => ClickStat, ...)
  // If you need click stats for a campaign, use ClickStatsRepository
  // .getCampaignStats(campaignId, organizationId) — no entity relation needed.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
