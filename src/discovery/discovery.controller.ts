import { Body, Controller, Get, Ip, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import {
  ApiGetFeed,
  ApiGetTrackStation,
  ApiGetUserRecentActivities,
  ApiGetArtistStation,
} from './discovery.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { EntityType } from '../search/types';
// import { search } from '../search/search'
// import { mapTrack, addDocuments, updateDocument, deleteDocument } from '../search/indexing'

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @ApiGetFeed()
  @Get('feed/following')
  async getFeed(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Body('includeReposts') includeReposts: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.discoveryService.getFeed(userId, ip, includeReposts, page, limit);
  }

  @ApiGetUserRecentActivities()
  @Get('/profile/:username/recent-activities')
  getUserRecentActivities(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Param('username') username: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.discoveryService.getUserRecentActivities(userId, username, ip, page, limit);
  }

  @ApiGetTrackStation()
  @Get('track-station/:artist_username/:track_name')
  async getTrackStation(
    @CurrentUser('sub') userId: string,
    @Param('artist_username') artistUsername: string,
    @Param('track_name') trackName: string,
    @Ip() ip: string
  ) {
    return this.discoveryService.getTrackStation(artistUsername, trackName, userId, ip);
  }

  @ApiGetArtistStation()
  @Get('artist-station/:username')
  async getArtistStation(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Ip() ip: string
  ) {
    return this.discoveryService.getArtistStation(username, userId, ip);
  }

  @ApiGetTrackStation()
  @Get('/profile/:username/popular-tracks')
  async getUserPopularTracks(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Ip() ip: string
  ) {
    return this.discoveryService.getUserPopularTracks(username, userId, ip);
  }

  @ApiGetTrackStation()
  @Get('/more-of-what-you-like')
  async getMoreOfWhatYouLike(@CurrentUser('sub') userId: string, @Ip() ip: string) {
    return this.discoveryService.getMoreOfWhatYouLike(userId, ip);
  }

  @ApiGetArtistStation()
  @Get('/search')
  async search(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Query('q') q: string,
    @Query('type') type?: EntityType,
    @Query('genre') genre?: string,
    @Query('tag') tag?: string,
    @Query('city') city?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.discoveryService.getSearchResults(
      userId,
      q,
      type,
      genre,
      tag,
      city,
      ip,
      page,
      limit
    );
  }
  // GET /search?q=summer&type=track&genre=Hip-Hop
  // app.get('/search', async (req, res) => {
  //   const { q, type, genre, tags, city } = req.query

  //   const ids = await search({
  //     query: q as string,
  //     type: type as string,
  //     genre: genre as string,
  //     tags: tags ? (tags as string).split(',') : undefined,
  //     city: city as string,
  //   })

  //   // Strip prefix and batch fetch from DB
  //   const rawIds = ids.map((id) => id.replace(/^(track|user|playlist|album)_/, ''))
  //   const tracks = await db.track.findMany({ where: { id: { in: rawIds } } })

  //   // Reorder to match search ranking
  //   const ordered = ids
  //     .map((id) => tracks.find((t) => `track_${t.id}` === id))
  //     .filter(Boolean)

  //   res.json(ordered)
  // })

  // // GET /search/autocomplete?q=su
  // app.get('/search/autocomplete', async (req, res) => {
  //   const { q, type } = req.query
  //   const hits = await autocomplete({ query: q as string, type: type as string })
  //   res.json(hits)
  // })

  // Call these from your service layer on DB mutations
  // async function onTrackCreated(track: Track) {
  //   await addDocuments([mapTrack(track)])
  // }

  // async function onTrackUpdated(track: Track) {
  //   await updateDocument(mapTrack(track))
  // }

  // async function onTrackDeleted(trackId: string) {
  //   await deleteDocument(`track_${trackId}`)
  // }
}
