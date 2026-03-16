import { IsString, Matches, registerDecorator, ValidationOptions } from 'class-validator';

function IsValidBirthdate(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsValidDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          const date = new Date(value);
          const now = new Date();

          const isFuture = date > now;
          const age = now.getFullYear() - date.getFullYear();
          const isTooYoung = age < 13;
          const isTooOld = age > 120;

          return !isFuture && !isTooYoung && !isTooOld;
        },
      },
    });
  };
}

export class UpdateBirthdateReqDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthdate must be in YYYY-MM-DD format' })
  @IsValidBirthdate({ message: 'Invalid Birthdate' })
  birthdate!: string;
}
