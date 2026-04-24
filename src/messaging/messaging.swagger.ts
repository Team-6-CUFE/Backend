import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiOkResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateChatDto } from './dto/api/create-chat.dto';
import { ChatResDto } from './dto/chat-res.dto';
import { MessageResDto } from './dto/message-res.dto';
import { PaginationDto } from './dto/api/pagination-dto';

export const ApiCreateChat = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Start or retrieve a direct message chat',
      description:
        'Creates a new 1-to-1 chat between the authenticated user and the target user. ' +
        'If a chat between them already exists it is returned instead (idempotent). ' +
        'Blocked users on either side will result in a 403.',
    }),
    ApiBody({ type: CreateChatDto }),
    ApiOkResponse({
      description: 'Chat created or existing chat returned',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          data: { $ref: getSchemaPath(ChatResDto) },
        },
      },
    }),
    ApiExtraModels(ChatResDto),
    ApiResponse({ status: 400, description: 'Cannot start a chat with yourself' }),
    ApiResponse({ status: 403, description: 'Block relationship exists between users' })
  );

export const ApiGetChats = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get inbox',
      description:
        'Returns all chats for the authenticated user ordered by most recent activity. ' +
        'Each chat includes the other participant, last message preview, unread count, and archive status.',
    }),
    ApiExtraModels(ChatResDto, PaginationDto),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiOkResponse({
      description: 'Paginated list of chats',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: getSchemaPath(ChatResDto) } },
          pagination: { $ref: getSchemaPath(PaginationDto) },
        },
      },
    })
  );

export const ApiGetMessages = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get messages in a chat',
      description:
        'Returns paginated messages for a chat the authenticated user is a participant in. ' +
        'Use the `before` cursor for infinite scroll — pass the oldest loaded `messageId` ' +
        'to fetch the next page of older messages.',
    }),
    ApiExtraModels(MessageResDto, PaginationDto),
    ApiParam({ name: 'chatId', type: String, description: 'UUID of the chat' }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({
      name: 'before',
      required: false,
      type: String,
      description: 'Load messages older than this messageId',
    }),
    ApiOkResponse({
      description: 'Paginated list of messages',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: getSchemaPath(MessageResDto) } },
          pagination: { $ref: getSchemaPath(PaginationDto) },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Not a participant in this chat' }),
    ApiResponse({ status: 404, description: 'Chat not found' })
  );

export const ApiArchiveChat = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Archive a chat',
      description:
        'Hides the chat from the main inbox for the authenticated user only. ' +
        'The other participant is unaffected. Archived chats auto-unarchive when a new message is received.',
    }),
    ApiParam({ name: 'chatId', type: String, description: 'UUID of the chat' }),
    ApiOkResponse({
      description: 'Chat archived',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Chat archived' },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Not a participant in this chat' }),
    ApiResponse({ status: 404, description: 'Chat not found' })
  );

export const ApiUnarchiveChat = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Unarchive a chat',
      description: 'Restores a previously archived chat to the main inbox.',
    }),
    ApiParam({ name: 'chatId', type: String, description: 'UUID of the chat' }),
    ApiOkResponse({
      description: 'Chat unarchived',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Chat unarchived' },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Not a participant in this chat' }),
    ApiResponse({ status: 404, description: 'Chat not found' })
  );

export const ApiMarkUnread = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Mark a chat as unread',
      description:
        'Manually resets the read state for the authenticated user so the chat ' +
        'appears unread in their inbox. Useful for flagging a conversation to return to later. ' +
        'Only affects the current user — the other participant is unaffected.',
    }),
    ApiParam({ name: 'chatId', type: String, description: 'UUID of the chat' }),
    ApiOkResponse({
      description: 'Chat marked as unread',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Chat marked as unread' },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Not a participant in this chat' }),
    ApiResponse({ status: 404, description: 'Chat not found' })
  );

export const ApiGetUnreadCount = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get total unread message count',
      description:
        'Returns the total number of unread messages across all chats for the authenticated user. ' +
        'Useful for badge counts in navigation.',
    }),
    ApiOkResponse({
      description: 'Total unread count',
      schema: {
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            properties: {
              unreadCount: { type: 'number', example: 5 },
            },
          },
        },
      },
    })
  );
