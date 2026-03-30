import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAdult', async: false })
export class IsAdultConstraint implements ValidatorConstraintInterface {
  validate(birthdate: any) {
    if (!(birthdate instanceof Date)) return false;

    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

    return birthdate <= minAgeDate;
  }

  defaultMessage() {
    return 'User must be at least 13 years old';
  }
}

export function IsAdult(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAdultConstraint,
    });
  };
}
