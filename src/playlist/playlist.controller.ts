import { Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlaylistService } from './playlist.service';
import { ApiRepostPlaylist, ApiUnrepostPlaylist } from './playlist.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Playlist')
@Controller('playlist')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @ApiRepostPlaylist()
  @Post(':playlistId/repost')
  repostPlaylist(@Param('playlistId') playlistId: string, @CurrentUser('sub') userId: string) {
    return this.playlistService.repostPlaylist(playlistId, userId);
  }

  @ApiUnrepostPlaylist()
  @Delete('/:playlistId/repost')
  removeRepost(@Param('playlistId') playlistId: string, @CurrentUser('sub') userId: string) {
    return this.playlistService.removeRepost(playlistId, userId);
  }
}
