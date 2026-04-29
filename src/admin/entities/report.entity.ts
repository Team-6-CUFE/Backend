import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ReportReason, ReportStatus, ReportType } from '../report-enums';

@Entity('reports')
export class Report extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId!: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId!: string; // who filed the report

  @Column({ type: 'enum', enum: ReportType })
  type!: ReportType; // USER | TRACK | COMMENT

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string; // the userId / trackId / commentId

  @Column({ type: 'enum', enum: ReportReason })
  reason!: ReportReason;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status!: ReportStatus;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date;
}
