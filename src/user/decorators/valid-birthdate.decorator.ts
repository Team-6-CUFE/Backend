import { registerDecorator, ValidationOptions } from 'class-validator';

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

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDateValidator(
      'IsNotFutureDate',
      (date, now) => date <= now,
      object,
      propertyName,
      validationOptions
    );
}

export function IsOldEnough(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDateValidator(
      'IsOldEnough',
      (date, now) => now.getFullYear() - date.getFullYear() >= 13,
      object,
      propertyName,
      validationOptions
    );
}

export function IsRealisticAge(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDateValidator(
      'IsRealisticAge',
      (date, now) => now.getFullYear() - date.getFullYear() <= 120,
      object,
      propertyName,
      validationOptions
    );
}
