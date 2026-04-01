import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'This is a comment',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsNotEmpty({ message: 'Comment content is required' })
  content!: string;

  @ApiPropertyOptional({
    description: 'UUID of the parent comment for nested replies',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: 'Timestamp in seconds within the track', example: 56 })
  @IsInt()
  @Min(0)
  timestampSeconds!: number;
}
