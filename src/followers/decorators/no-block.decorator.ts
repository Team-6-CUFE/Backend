import { UseGuards } from '@nestjs/common';
import { NoBlockGuard } from '../guards/no-block.guard';

/**
 decorator to make checking if a block rs exsits between 2 users easier and reusable
 IMPORTANT: can only be used after JWT guard meaning it cannot be used with @Public decorator
 */
export const CheckBlock = () => UseGuards(NoBlockGuard);
