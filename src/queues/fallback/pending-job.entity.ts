import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('pending_jobs')
export class PendingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  jobId: string;

  @Column()
  type: string; // email | click

  @Column('jsonb')
  payload: any;

  @Column({ default: 'pending' })
  status: 'pending' | 'done' | 'failed';

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp' })
  nextRetryAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
