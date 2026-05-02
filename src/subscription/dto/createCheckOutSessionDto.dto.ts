import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum PlanType {
  PRO = 'pro',
  GOPLUS = 'go+',
}

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsNotEmpty()
  @IsEnum(PlanType)
  plan!: PlanType;

  @IsNotEmpty()
  @IsString()
  paymentMethodId!: string; // ← add this
}
