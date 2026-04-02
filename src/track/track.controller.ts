import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  Delete,
  Patch,
  Query,
  UseInterceptors,
  BadRequestException,
  UploadedFiles,
  Sse,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { TrackService } from './track.service';
import {
  ApiEditTrackRepost,
  ApiGetTrackLikes,
  ApiGetTrackLikesCount,
  ApiGetTrackReposts,
  ApiGetTrackRepostsCount,
  ApiGetUserTrackLikes,
  ApiGetUserTrackReposts,
  ApiLikeTrack,
  ApiRemoveTrackLike,
  ApiRemoveTrackRepost,
  ApiRepostTrack,
  ApiTrackComment,
  ApiDeleteComment,
  ApiGetTrackComments,
  ApiUploadTrack,
  ApiStreamTrackStatus,
} from './track.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CheckBlock } from '../followers/decorators/no-block.decorator';
import { AddCommentDto } from './dto/add-comment.dto';
import { UploadTrackDto } from './dto/upload-track.dto';
import { TrackSseService } from './services/track-sse.service';

const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/aiff',
  'audio/x-aiff',
];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AUDIO_SIZE = 4 * 1024 * 1024 * 1024; // 4 GB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('Tracks')
@Controller('tracks')
export class TrackController {
  constructor(
    private readonly trackService: TrackService,
    private readonly trackSseService: TrackSseService
  ) {}

  @ApiRepostTrack()
  @Post(':trackId/repost')
  repostTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body('caption') caption: string
  ) {
    return this.trackService.repostTrack(trackId, userId, caption);
  }

  @ApiGetTrackRepostsCount()
  @Get(':trackId/reposts/count')
  getTrackRepostsCount(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.getTrackRepostsCount(trackId, userId);
  }

  @ApiRemoveTrackRepost()
  @Delete(':trackId/repost')
  removeTrackRepost(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.removeTrackRepost(trackId, userId);
  }

  @ApiEditTrackRepost()
  @Patch(':trackId/repost')
  editTrackRepost(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body('caption') caption: string
  ) {
    return this.trackService.editTrackRepost(trackId, userId, caption);
  }

  @ApiGetTrackReposts()
  @Get(':trackId/reposts')
  getTrackReposts(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getTrackReposts(trackId, userId, page, limit);
  }

  @ApiGetUserTrackReposts()
  @CheckBlock()
  @Get('users/:user_id/reposts')
  getUserTrackReposts(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') myUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getUserTrackReposts(userId, myUserId, page, limit);
  }

  @ApiLikeTrack()
  @Post(':trackId/like')
  likeTrack(@Param('trackId', ParseUUIDPipe) trackId: string, @CurrentUser('sub') userId: string) {
    return this.trackService.likeTrack(trackId, userId);
  }

  @ApiGetTrackLikesCount()
  @Get(':trackId/likes/count')
  getTrackLikessCount(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.getTrackLikesCount(trackId, userId);
  }

  @ApiRemoveTrackLike()
  @Delete(':trackId/like')
  removeTrackLike(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.removeTrackLike(trackId, userId);
  }

  @ApiGetTrackLikes()
  @Get(':trackId/likes')
  getTrackLikes(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getTrackLikes(trackId, userId, page, limit);
  }

  @ApiGetUserTrackLikes()
  @CheckBlock()
  @Get('users/:user_id/likes')
  getUserTrackLikes(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') myUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getUserTrackLikes(userId, myUserId, page, limit);
  }

  @ApiTrackComment()
  @CheckBlock()
  @Post(':trackId/comment')
  comment(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body() commentDto: AddCommentDto
  ) {
    return this.trackService.addComment(trackId, userId, commentDto);
  }

  @ApiDeleteComment()
  @CheckBlock()
  @Delete(':trackId/comments/:commentId')
  deleteComment(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.deleteComment(trackId, commentId, userId);
  }

  @ApiGetTrackComments()
  @Get(':trackId/comments')
  @CheckBlock()
  getTrackComments(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('order') order: 'timestamp' | 'newest' | 'oldest' = 'timestamp'
  ) {
    return this.trackService.getTrackComments(trackId, userId, page, limit, order);
  }

  @ApiUploadTrack()
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_AUDIO_SIZE },
        fileFilter: (_, file, cb) => {
          if (file.fieldname === 'audio') {
            if (ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(
                new BadRequestException('Invalid audio type. Allowed: MP3, WAV, FLAC, AIFF'),
                false
              );
            }
          } else if (file.fieldname === 'cover') {
            if (file.size > MAX_IMAGE_SIZE) {
              cb(new BadRequestException('Cover image must be under 10 MB'), false);
            } else if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(new BadRequestException('Invalid cover type. Allowed: JPEG, PNG, WebP'), false);
            }
          } else {
            cb(null, false);
          }
        },
      }
    )
  )
  async uploadTrack(
    @CurrentUser('sub') userId: string,
    @Body() dto: UploadTrackDto,
    @UploadedFiles() files: { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] }
  ) {
    const audioFile = files?.audio?.[0];
    if (!audioFile) {
      throw new BadRequestException('Audio file is required');
    }
    const coverFile = files?.cover?.[0];
    return this.trackService.uploadTrack(userId, dto, audioFile, coverFile);
  }

  @ApiStreamTrackStatus()
  @Sse(':trackId/status/stream')
  streamTrackStatus(@Param('trackId', ParseUUIDPipe) trackId: string): Observable<MessageEvent> {
    return this.trackSseService.getStream(trackId);
  }
}
