import { IsIn } from 'class-validator';

export class UpdateGenderReqDto {
  @IsIn(['male', 'female', 'preferNotToSay'], {
    message: "Gender must be one of: 'male','female','preferNotToSay'",
  })
  gender!: string;
}
