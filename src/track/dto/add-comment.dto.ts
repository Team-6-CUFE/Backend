import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddCommentDto {
  @ApiPropertyOptional({
    description: 'Comment content',
    example: 'This is a comment',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsNotEmpty({ message: 'Comment content is required' })
  content?: string;

  @ApiPropertyOptional({
    description: 'ID of the parent comment for nested replies',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Timestamp of the comment', example: 56 })
  @IsNumber()
  timestampSeconds?: number;
}
