import { IsString, Matches, registerDecorator, ValidationOptions } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function registerDateValidator(
  name: string,
  validate: (date: Date, now: Date) => boolean,
  object: object,
  propertyName: string,
  validationOptions?: ValidationOptions
) {
  registerDecorator({
    name,
    target: object.constructor,
    propertyName,
    options: validationOptions,
    validator: {
      validate(value: string) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        return validate(date, new Date());
      },
    },
  });
}

function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDateValidator(
      'IsNotFutureDate',
      (date, now) => date <= now,
      object,
      propertyName,
      validationOptions
    );
}

function IsOldEnough(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDateValidator(
      'IsOldEnough',
      (date, now) => now.getFullYear() - date.getFullYear() >= 13,
      object,
      propertyName,
      validationOptions
    );
}

function IsRealisticAge(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDateValidator(
      'IsRealisticAge',
      (date, now) => now.getFullYear() - date.getFullYear() <= 120,
      object,
      propertyName,
      validationOptions
    );
}

export class UpdateBirthdateReqDto {
  @ApiProperty({
    description:
      'Birthdate in YYYY-MM-DD format. Must not be in the future, user must be at least 13 and at most 120 years old.',
    example: '1999-05-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthdate must be in YYYY-MM-DD format' })
  @IsNotFutureDate({ message: 'Birthdate cannot be in the future' })
  @IsOldEnough({ message: 'You must be at least 13 years old' })
  @IsRealisticAge({ message: 'Please enter a valid birthdate' })
  birthdate!: string;
}
