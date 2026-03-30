import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from 'typeorm';

@Entity('pending_oauth_tokens')
export class PendingOAuthToken extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  token!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ name: 'provider_id', type: 'varchar' })
  providerId!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;
}
