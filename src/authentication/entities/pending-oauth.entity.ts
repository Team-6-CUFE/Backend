import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from 'typeorm';

@Entity('pending_oauth_tokens')
export class PendingOAuthToken extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  token!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'varchar' })
  provider_id!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  first_name!: string;

  @Column({ type: 'varchar' })
  last_name!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;
}
