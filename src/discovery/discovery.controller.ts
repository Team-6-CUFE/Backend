import { Body, Controller, Get, Ip, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import {
  ApiGetFeed,
  ApiGetTrackStation,
  ApiGetUserRecentActivities,
  ApiGetArtistStation,
  ApiGetUserPopularTracks,
  ApiGetMoreOfWhatYouLike,
  ApiSearch,
  ApiSearchAutocomplete,
  ApiGetRecommendedStations,
  ApiGetTrendingMusicByGenre,
  ApiGetTracksByTag,
  ApiGetLikedByUsers,
  ApiGetLikedByUsersForUser,
  ApiGetMoreAlbumsOfWhatYouLike,
  ApiGetDiscoverFeed,
  ApiGetPublicTrendingMusicByGenre,
  ApiGetArtistsToWatchOutFor,
  ApiGetCuratedPlaylists,
} from './discovery.swagger';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { EntityType } from '../search/types';
import { Public } from '../authentication/decorators/public.decorator';

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
    @Query('limit') limit: number = 20,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getFeed(userId, ip, includeReposts, page, limit, plan);
  }

  @ApiGetUserRecentActivities()
  @Get('/profile/:username/recent-activities')
  getUserRecentActivities(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Param('username') username: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getUserRecentActivities(userId, username, ip, page, limit, plan);
  }

  @ApiGetTrackStation()
  @Get('track-station/:artist_username/:track_name')
  async getTrackStation(
    @CurrentUser('sub') userId: string,
    @Param('artist_username') artistUsername: string,
    @Param('track_name') trackName: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getTrackStation(artistUsername, trackName, userId, ip, plan);
  }

  @ApiGetArtistStation()
  @Get('artist-station/:username')
  async getArtistStation(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getArtistStation(username, userId, ip, plan);
  }

  @ApiGetUserPopularTracks()
  @Get('/profile/:username/popular-tracks')
  async getUserPopularTracks(
    @CurrentUser('sub') userId: string,
    @Param('username') username: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getUserPopularTracks(username, userId, ip, plan);
  }

  @ApiGetMoreOfWhatYouLike()
  @Get('/more-of-what-you-like')
  async getMoreOfWhatYouLike(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getMoreOfWhatYouLike(userId, ip, plan);
  }

  @ApiSearch()
  @Get('/search')
  async search(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Query('q') q: string,
    @Query('type') type?: EntityType,
    @Query('tag') tag?: string,
    @Query('city') city?: string,
    @Query('duration') duration?: string,
    @Query('created') createdAt?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getSearchResults(
      userId,
      q,
      type,
      tag,
      city,
      duration,
      createdAt,
      ip,
      page,
      limit,
      plan
    );
  }

  @ApiSearchAutocomplete()
  @Get('/autocomplete')
  async searchAutocomplete(@Query('q') q: string) {
    return this.discoveryService.searchAutocomplete(q);
  }

  @ApiGetRecommendedStations()
  @Get('/recommended-stations')
  async getRecommendedStations(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getRecommendedStations(userId, ip, plan);
  }

  @ApiGetTrendingMusicByGenre()
  @Get('/trending/genres')
  async getTrendingMusicByGenre(@CurrentUser('sub') userId: string) {
    return this.discoveryService.getTrendingMusicByGenre(userId);
  }

  @ApiGetPublicTrendingMusicByGenre()
  @Public()
  @Get('/trending/genres/random')
  async getTrendingMusicByGenreRandom() {
    return this.discoveryService.getTrendingMusicByGenre();
  }

  @ApiGetLikedByUsers()
  @Get('/liked-by-users')
  async getLikedbyUsers(@CurrentUser('sub') userId: string) {
    return this.discoveryService.getLikedByUsers(userId);
  }

  @ApiGetLikedByUsersForUser()
  @Get('/liked-by/users/:userId')
  async getLikedByUsersForUser(
    @Param('userId') userId: string,
    @CurrentUser('sub') currentUserId: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getUserLikedby(userId, currentUserId, ip, plan);
  }

  @ApiGetTracksByTag()
  @Get('/tags/:tag_name')
  async getTracksByTag(
    @CurrentUser('sub') userId: string,
    @Param('tag_name') tagName: string,
    @Ip() ip: string,
    @Query('type') type: string = 'recent',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getTracksByTag(userId, tagName, ip, type, page, limit, plan);
  }

  @ApiGetMoreAlbumsOfWhatYouLike()
  @Get('/albums/more-albums-of-what-you-like')
  async getMoreAlbumsOfWhatYouLike(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getMoreAlbumsOfWhatYouLike(userId, ip, plan);
  }

  @ApiGetDiscoverFeed()
  @Get('feed/discover')
  async getDiscoverFeed(
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @CurrentUser('plan') plan?: string
  ) {
    return this.discoveryService.getDiscoverFeed(userId, ip, plan);
  }

  @ApiGetArtistsToWatchOutFor()
  @Get('artists-to-watch-out-for')
  @Public()
  async getArtistsToWatchOutFor() {
    return this.discoveryService.getArtistsToWatchOutFor();
  }

  @ApiGetCuratedPlaylists()
  @Get('curated')
  @Public()
  async getCuratedPlaylists() {
    return this.discoveryService.getCuratedPlaylists();
  }
}
