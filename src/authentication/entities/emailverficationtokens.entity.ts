import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum TokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}
@Entity('email_verification_tokens')
export class EmailVerificationToken extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: TokenType.EMAIL_VERIFICATION,
  })
  type!: TokenType;

  // Relationship
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
