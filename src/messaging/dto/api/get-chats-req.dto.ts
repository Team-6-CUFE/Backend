import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChatFilter } from '../../enums/chat-filter.enum';

export class GetChatsReqDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of chats per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter chats by status',
    enum: ChatFilter,
    default: ChatFilter.ALL,
  })
  @IsOptional()
  @IsEnum(ChatFilter)
  filter?: ChatFilter = ChatFilter.ALL;
}
