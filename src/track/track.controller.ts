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
  UploadedFile,
  Sse,
  Ip,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Observable, from, of, switchMap } from 'rxjs';
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
  ApiUpdateTrackMetadata,
  ApiReuploadTrackAudio,
  ApiPlayTrack,
  ApiGetTopFans,
  ApiGetFirstFans,
  ApiGetUploadQuota,
  ApiGetUserTracks,
  ApiGetTrackPlaylists,
  ApiGetAllGenres,
  ApiGetTrack,
  ApiGetTrackAudio,
  ApiUpdateBlockedRegions,
  ApiDeleteTrack,
  ApiGetRelatedTracks,
  ApiGetAllTimeStats,
} from './track.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CheckBlock } from '../followers/decorators/no-block.decorator';
import { AddCommentDto } from './dto/add-comment.dto';
import { UploadTrackDto } from './dto/upload-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { TrackSseService } from './services/track-sse.service';
import { TrackStatus } from './enums/track-status.enum';
import { Public } from '../authentication/decorators/public.decorator';
import { OptionalCurrentUser } from '../authentication/decorators/optional-current-user.decorator';
import { JwtPayload } from '../authentication/strategies/jwt.strategy';
import { BlockedRegionsDto } from './dto/blocked-regions.dto';

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
    // if processing already finished, emit terminal event immediately
    return from(this.trackService.getTrackById(trackId)).pipe(
      switchMap((track) => {
        if (track.trackStatus === TrackStatus.FINISHED) {
          return of({
            data: {
              event: 'completed',
              data: {
                trackId,
                audioUrl: track.audioUrl,
                audioUrlHq: track.audioUrlHq,
                previewAudioUrl: track.previewAudioUrl,
                waveformUrl: track.waveformUrl,
                durationSeconds: track.durationSeconds,
              },
            },
          } as MessageEvent);
        }
        if (track.trackStatus === TrackStatus.FAILED) {
          return of({
            data: { event: 'failed', data: { trackId, error: 'Processing failed' } },
          } as MessageEvent);
        }
        return this.trackSseService.getStream(trackId);
      })
    );
  }

  @ApiUpdateTrackMetadata()
  @Patch(':trackId/metadata')
  @UseInterceptors(
    FileInterceptor('cover', {
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_, file, cb) => {
        if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid cover type. Allowed: JPEG, PNG, WebP'), false);
        }
      },
    })
  )
  updateTrackMetadata(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateTrackDto,
    @UploadedFile() coverFile?: Express.Multer.File
  ) {
    return this.trackService.updateTrackMetadata(trackId, userId, dto, coverFile);
  }

  @ApiReuploadTrackAudio()
  @Patch(':trackId/audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: MAX_AUDIO_SIZE },
      fileFilter: (_, file, cb) => {
        if (ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid audio type. Allowed: MP3, WAV, FLAC, AIFF'), false);
        }
      },
    })
  )
  async reuploadTrackAudio(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() audioFile: Express.Multer.File,
    @Body('previewStartTime') previewStartTime?: string
  ) {
    if (!audioFile) throw new BadRequestException('Audio file is required');
    return this.trackService.reuploadTrackAudio(trackId, userId, audioFile, previewStartTime);
  }

  @ApiPlayTrack()
  @Post(':id/play')
  async playTrack(
    @Param('id', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body('playlistId', new ParseUUIDPipe({ optional: true })) playlistId?: string
  ) {
    return this.trackService.playTrack(trackId, userId, playlistId);
  }

  @ApiGetTopFans()
  @Get(':trackId/top-fans')
  getTopFans(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.trackService.getTopFans(trackId);
  }

  @ApiGetFirstFans()
  @Get(':trackId/first-fans')
  getFirstFans(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.trackService.getFirstFans(trackId);
  }

  @ApiGetUploadQuota()
  @Get('/users/upload-qouta')
  async getUserTimeUser(@CurrentUser('sub') userId: string) {
    return this.trackService.getUserQuota(userId);
  }

  @ApiGetUserTracks()
  @Get('users/:userId/tracks')
  async getUserUploadedTracks(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') currentUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getUserUploadedTracks(userId, currentUserId, page, limit);
  }

  @ApiGetTrackPlaylists()
  @Get(':trackId/playlists')
  async getTrackPlaylists(
    @Param('trackId', ParseUUIDPipe) userId: string,
    @CurrentUser('sub') currentUserId: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.trackService.getTrackPlaylists(userId, currentUserId, page, limit);
  }

  @ApiGetAllGenres()
  @Public()
  @Get('genres')
  getAllGenres() {
    return this.trackService.getAllGenres();
  }

  @ApiGetAllTimeStats()
  @Get('all-time-stats')
  getAllTimeStats(@CurrentUser('sub') userId: string) {
    return this.trackService.getAllTimeStats(userId);
  }

  @ApiGetTrack()
  @Public()
  @Get(':trackId')
  getTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @OptionalCurrentUser() user?: JwtPayload,
    @Ip() ip?: string
  ) {
    return this.trackService.getTrack(trackId, user, ip);
  }

  @ApiGetTrackAudio()
  @Public()
  @Get(':trackId/stream')
  getTrackAudio(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @OptionalCurrentUser() user?: JwtPayload
  ) {
    return this.trackService.getTrackAudio(trackId, user);
  }

  @ApiUpdateBlockedRegions()
  @Post(':trackId/blocked-regions')
  updateBlockedRegions(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: BlockedRegionsDto
  ) {
    return this.trackService.updateBlockedRegions(trackId, userId, dto);
  }

  @ApiDeleteTrack()
  @Delete(':trackId')
  deleteTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.trackService.deleteTrack(trackId, userId);
  }

  @ApiGetRelatedTracks()
  @Get(':artistUsername/:title/related-tracks')
  getRelatedTracks(
    @Param('artistUsername') artistUsername: string,
    @Param('title') title: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.trackService.getRelatedTracks(title, artistUsername, page, limit);
  }
}
