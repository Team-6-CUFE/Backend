import { IsIn } from 'class-validator';

export class UpdateGenderReqDto {
  @IsIn(['male', 'female', 'prefer_not_to_say'], {
    message: "Gender must be one of: 'male','female','prefer_not_to_say'",
  })
  gender!: string;
}
