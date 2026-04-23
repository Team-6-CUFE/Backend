import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, HttpException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from './user.repository';
import { GenreRepository } from '../genre/genre.repository';
import { UsernameAvailabilityService } from './username-availability.service';
import { ExternalProfileRepository } from './external-profile.repository';
import { StorageService } from '../common/storage_service';
import { TrackRepository } from './user_track.repository';
import {
  mockUserRepository,
  mockGenreRepository,
  mockUsernameAvailabilityService,
  mockUser,
  mockUserId,
  mockUsername,
  mockExternalProfileRepository,
  mockFile,
  mockStorageService,
  mockUserTrackRepository,
} from './test/user.mock';

jest.mock('meilisearch', () => ({
  Meilisearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      addDocuments: jest.fn(),
      search: jest.fn(),
    }),
  })),
}));

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let genreRepo: ReturnType<typeof mockGenreRepository>;
  let usernameAvailability: ReturnType<typeof mockUsernameAvailabilityService>;
  let storageService: ReturnType<typeof mockStorageService>;
  let trackRepo: ReturnType<typeof mockUserTrackRepository>;

  let externalRepo: any;
  const mockProfileId = 'prof-999';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: UserRepository, useFactory: mockUserRepository },
        { provide: GenreRepository, useFactory: mockGenreRepository },
        { provide: UsernameAvailabilityService, useFactory: mockUsernameAvailabilityService },
        { provide: ExternalProfileRepository, useFactory: mockExternalProfileRepository },
        { provide: StorageService, useFactory: mockStorageService },
        { provide: TrackRepository, useFactory: mockUserTrackRepository },
      ],
    }).compile();

    service = module.get(ProfileService);
    userRepo = module.get(UserRepository);
    genreRepo = module.get(GenreRepository);
    usernameAvailability = module.get(UsernameAvailabilityService);
    trackRepo = module.get(TrackRepository);
    externalRepo = module.get(ExternalProfileRepository);
    storageService = module.get(StorageService);

    externalRepo.findAllByUserId = jest.fn();
    externalRepo.countUserProfiles = jest.fn();
    externalRepo.findDuplicateProfile = jest.fn();
    externalRepo.findById = jest.fn();
    externalRepo.update = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('findMyProfile', () => {
    it('should handle null favoriteGenres', async () => {
      userRepo.findById.mockResolvedValue({ ...mockUser(), favoriteGenres: null as any });

      const result = await service.findMyProfile(mockUserId);

      expect(result.data.favoriteGenres).toEqual([]);
    });
    it('should return shaped profile data for existing user', async () => {
      userRepo.findById.mockResolvedValue(mockUser());

      const result = await service.findMyProfile(mockUserId);

      expect(result.status).toBe('Success');
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.favoriteGenres).toEqual(['Rock']);
      expect(result.data.birthdate).toBe('1998-01-01');
      expect(userRepo.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('should return null email if no primary email exists', async () => {
      const user = mockUser();
      user.emails = [];
      userRepo.findById.mockResolvedValue(user);

      const result = await service.findMyProfile(mockUserId);

      expect(result.data.email).toBeNull();
    });

    it('should return null birthdate if birthdate is null', async () => {
      const user = mockUser();
      user.birthdate = null as any;
      userRepo.findById.mockResolvedValue(user);

      const result = await service.findMyProfile(mockUserId);

      expect(result.data.birthdate).toBeNull();
    });

    it('should return empty favoriteGenres if none exist', async () => {
      const user = mockUser();
      user.favoriteGenres = [];
      userRepo.findById.mockResolvedValue(user);

      const result = await service.findMyProfile(mockUserId);

      expect(result.data.favoriteGenres).toEqual([]);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.findMyProfile(mockUserId)).rejects.toThrow(NotFoundException);

      await expect(service.findMyProfile(mockUserId)).rejects.toThrow('User not found');
    });
  });

  describe('findProfile', () => {
    it('should handle null favoriteGenres', async () => {
      userRepo.findByUsername.mockResolvedValue({ ...mockUser(), favoriteGenres: null as any });

      const result = await service.findProfile(mockUsername);

      expect(result.data.favoriteGenres).toEqual([]);
    });
    it('should return public profile data for existing username', async () => {
      userRepo.findByUsername.mockResolvedValue(mockUser());

      const result = await service.findProfile(mockUsername);

      expect(result.status).toBe('Success');
      expect(result.data.username).toBe(mockUsername);
      expect(result.data.favoriteGenres).toEqual(['Rock']);
      expect(userRepo.findByUsername).toHaveBeenCalledWith(mockUsername);
    });

    it('should throw NotFoundException for unknown username', async () => {
      userRepo.findByUsername.mockResolvedValue(null);

      await expect(service.findProfile('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const dto = { displayName: 'New Name', favoriteGenres: ['Jazz'] };

    it('should handle null favoriteGenres on updated user', async () => {
      const user = mockUser();
      userRepo.findById.mockResolvedValue(user);
      userRepo.update.mockResolvedValue({ ...mockUser(), favoriteGenres: null as any });

      const result = await service.updateProfile(mockUserId, { displayName: 'Test' });

      expect(result.data.favoriteGenres).toEqual([]);
    });
    it('should update profile and return shaped response', async () => {
      const user = mockUser();
      userRepo.findById.mockResolvedValue(user);
      genreRepo.findByNames.mockResolvedValue([{ genreId: 'g1', name: 'Jazz' }]);
      userRepo.updateFavoriteGenres.mockResolvedValue(undefined);
      userRepo.update.mockResolvedValue({
        ...user,
        displayName: 'New Name',
        favoriteGenres: [{ genre: { name: 'Jazz' } }],
      });

      const result = await service.updateProfile(mockUserId, dto);

      expect(result.status).toBe('Success');
      expect(result.data.displayName).toBe('New Name');
      expect(userRepo.updateFavoriteGenres).toHaveBeenCalledTimes(1);
    });

    it('should NOT call updateFavoriteGenres if favoriteGenres not in dto', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());

      await service.updateProfile(mockUserId, { displayName: 'Only Name' });

      expect(userRepo.updateFavoriteGenres).not.toHaveBeenCalled();
    });

    it('should add new username to bloom filter when username is changed', async () => {
      const user = mockUser();
      userRepo.findById.mockResolvedValue(user);
      userRepo.update.mockResolvedValue({ ...user, username: 'newusername' });

      await service.updateProfile(mockUserId, { username: 'newusername' });

      expect(usernameAvailability.addToFilter).toHaveBeenCalledWith('newusername');
    });

    it('should NOT call addToFilter if username not changed', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());

      await service.updateProfile(mockUserId, { bio: 'new bio' });

      expect(usernameAvailability.addToFilter).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.updateProfile(mockUserId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should convert birthdate string to Date object in userData', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());

      await service.updateProfile(mockUserId, { birthdate: '1999-05-15' });

      expect(userRepo.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ birthdate: new Date('1999-05-15') })
      );
    });

    it('should NOT set birthdate in userData when birthdate is not in dto', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());

      await service.updateProfile(mockUserId, { displayName: 'No birthdate' });

      const callArg = userRepo.update.mock.calls[0][1] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('birthdate');
    });

    it('should coerce isPublic to boolean when provided', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());

      await service.updateProfile(mockUserId, { isPublic: false });

      expect(userRepo.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ isPublic: false })
      );
    });

    it('should include gender in userData when provided', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue({ ...mockUser(), gender: 'female' });

      await service.updateProfile(mockUserId, { gender: 'female' });

      expect(userRepo.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ gender: 'female' })
      );
    });

    it('should call updateAvatar when avatarFile is provided in files', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());
      const avatarSpy = jest.spyOn(service, 'updateAvatar').mockResolvedValue({
        status: 'Success',
        message: '',
        data: { avatarUrl: 'url', updatedAt: new Date() },
      });

      await service.updateProfile(mockUserId, {}, { avatarFile: mockFile() });

      expect(avatarSpy).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ fieldname: 'file' })
      );
    });

    it('should call updateCover when coverFile is provided in files', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());
      const coverSpy = jest.spyOn(service, 'updateCover').mockResolvedValue({
        status: 'Success',
        message: '',
        data: { coverPhoto: 'url', updatedAt: new Date() },
      });

      await service.updateProfile(mockUserId, {}, { coverFile: mockFile() });

      expect(coverSpy).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ fieldname: 'file' })
      );
    });

    it('should NOT call updateAvatar or updateCover when no files are provided', async () => {
      userRepo.findById.mockResolvedValue(mockUser());
      userRepo.update.mockResolvedValue(mockUser());
      const avatarSpy = jest.spyOn(service, 'updateAvatar');
      const coverSpy = jest.spyOn(service, 'updateCover');

      await service.updateProfile(mockUserId, { displayName: 'No files' });

      expect(avatarSpy).not.toHaveBeenCalled();
      expect(coverSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateMyBirthdate', () => {
    it('should return formatted birthdate and correct age', async () => {
      const birthYear = new Date().getFullYear() - 25;
      const user = { ...mockUser(), birthdate: new Date(`${birthYear}-06-15`) };
      userRepo.update.mockResolvedValue(user);

      const result = await service.updateMyBirthdate(mockUserId, {
        birthdate: `${birthYear}-06-15`,
      });

      expect(result.status).toBe('Success');
      expect(result.data.birthdate).toBe(`${birthYear}-06-15`);
      expect(result.data.age).toBe(25);
      expect(result.data.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.update.mockResolvedValue(null);

      await expect(
        service.updateMyBirthdate(mockUserId, { birthdate: '1998-01-01' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyGender', () => {
    it('should return updated gender', async () => {
      userRepo.update.mockResolvedValue({ ...mockUser(), gender: 'female' });

      const result = await service.updateMyGender(mockUserId, { gender: 'female' });

      expect(result.status).toBe('Success');
      expect(result.data.gender).toBe('female');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.update.mockResolvedValue(null);

      await expect(service.updateMyGender(mockUserId, { gender: 'male' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateMyPrivacy', () => {
    it('should return updated privacy setting', async () => {
      userRepo.update.mockResolvedValue({ ...mockUser(), isPublic: false });

      const result = await service.updateMyPrivacy(mockUserId, { isPublic: false });

      expect(result.status).toBe('Success');
      expect(result.data.isPublic).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.update.mockResolvedValue(null);

      await expect(service.updateMyPrivacy(mockUserId, { isPublic: true })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('isUsernameTaken', () => {
    it('should return available: true when username is free', async () => {
      usernameAvailability.isUsernameTaken.mockResolvedValue(false);

      const result = await service.isUsernameTaken('freeusername');

      expect(result.data.available).toBe(true);
      expect(result.data.username).toBe('freeusername');
    });

    it('should return available: false when username is taken', async () => {
      usernameAvailability.isUsernameTaken.mockResolvedValue(true);

      const result = await service.isUsernameTaken('takenusername');

      expect(result.data.available).toBe(false);
      expect(result.data.message).toBe('Username is already taken');
    });
  });

  describe('getMyExternalProfiles', () => {
    it('should return all profiles for a user', async () => {
      const mockProfiles = [{ id: '1', name: 'GitHub' }];
      externalRepo.findAllByUserId.mockResolvedValue(mockProfiles);

      const result = await service.getMyExternalProfiles(mockUserId);
      expect(result.status).toBe('Success');
      expect(result.data).toEqual(mockProfiles);
    });
  });

  describe('addExternalProfile', () => {
    const dto = { name: 'GitHub', url: 'https://github.com' };

    it('should successfully add a profile', async () => {
      externalRepo.countUserProfiles.mockResolvedValue(0);
      externalRepo.findDuplicateProfile.mockResolvedValue(null);
      externalRepo.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.addExternalProfile(mockUserId, dto);
      expect(result.status).toBe('Success');
      expect(result.data.name).toBe('GitHub');
    });

    it('should throw 400 if user already has 10 profiles', async () => {
      externalRepo.countUserProfiles.mockResolvedValue(10);

      try {
        await service.addExternalProfile(mockUserId, dto);
      } catch (e: any) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(400);
      }
    });

    it('should throw 409 if duplicate profile exists', async () => {
      externalRepo.countUserProfiles.mockResolvedValue(0);
      externalRepo.findDuplicateProfile.mockResolvedValue({ id: '2', name: 'GitHub' });

      try {
        await service.addExternalProfile(mockUserId, dto);
      } catch (e: any) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(409);
      }
    });
  });

  describe('updateExternalProfile', () => {
    const updateDto = { name: 'NewName' };

    it('should successfully update a profile', async () => {
      externalRepo.findById.mockResolvedValue({ id: mockProfileId, name: 'OldName' });
      externalRepo.findDuplicateProfile.mockResolvedValue(null);
      externalRepo.update.mockResolvedValue({ id: mockProfileId, name: 'NewName' });

      const result = await service.updateExternalProfile(mockUserId, mockProfileId, updateDto);
      expect(result.status).toBe('Success');
      expect(result.data!.name).toBe('NewName');
    });

    it('should throw 404 if profile does not exist', async () => {
      externalRepo.findById.mockResolvedValue(null);

      try {
        await service.updateExternalProfile(mockUserId, mockProfileId, updateDto);
      } catch (e: any) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(404);
      }
    });
  });

  describe('deleteExternalProfile', () => {
    it('should successfully delete a profile', async () => {
      externalRepo.findById.mockResolvedValue({ id: mockProfileId });
      externalRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteExternalProfile(mockUserId, mockProfileId);
      expect(result.status).toBe('Success');
    });

    it('should throw 404 if profile to delete is not found', async () => {
      externalRepo.findById.mockResolvedValue(null);

      try {
        await service.deleteExternalProfile(mockUserId, mockProfileId);
      } catch (e: any) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('updateAvatar', () => {
    it('should successfully update avatar and return S3 URL', async () => {
      const file = mockFile();
      const mockS3Url = 'https://s3.amazonaws.com/bucket/avatar.webp';

      userRepo.findById.mockResolvedValue(mockUser());
      storageService.uploadFile.mockResolvedValue({ Location: mockS3Url });
      userRepo.update.mockResolvedValue({ updatedAt: new Date() });

      const result = await service.updateAvatar(mockUserId, file);

      expect(result.status).toBe('Success');
      expect(result.data.avatarUrl).toBe(mockS3Url);
      expect(storageService.uploadFile).toHaveBeenCalled();
    });

    it('should throw 404 if user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.updateAvatar(mockUserId, mockFile())).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCover', () => {
    it('should successfully update cover photo and return S3 URL', async () => {
      const file = mockFile();
      const mockS3Url = 'https://s3.amazonaws.com/bucket/cover.jpg';

      userRepo.findById.mockResolvedValue(mockUser());
      storageService.uploadFile.mockResolvedValue({ Location: mockS3Url });
      userRepo.update.mockResolvedValue({ updatedAt: new Date() });

      const result = await service.updateCover(mockUserId, file);

      expect(result.status).toBe('Success');
      expect(result.data.coverPhoto).toBe(mockS3Url);
      expect(storageService.uploadFile).toHaveBeenCalled();
    });

    it('should throw 404 if user not found', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.updateCover(mockUserId, mockFile())).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getRecentlyPlayed ────────────────────────────────────────────────────────

  describe('getRecentlyPlayed', () => {
    it('should return recently played items wrapped in success envelope', async () => {
      const rows = [
        {
          type: 'artist' as const,
          playedAt: new Date('2024-06-02T12:00:00Z'),
          artist: {
            userId: 'artist-uuid',
            username: 'dj_nour',
            displayName: 'Nour',
            avatarUrl: 'https://example.com/avatar.jpg',
            followersCount: 500,
          },
        },
      ];
      trackRepo.findByUser.mockResolvedValue(rows);

      const result = await service.getRecentlyPlayed(mockUserId);

      expect(trackRepo.findByUser).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ status: 'success', data: rows });
    });

    it('should return empty data array when no history', async () => {
      trackRepo.findByUser.mockResolvedValue([]);

      const result = await service.getRecentlyPlayed(mockUserId);

      expect(result.data).toEqual([]);
    });

    it('should return playlist rows as well', async () => {
      const rows = [
        {
          type: 'playlist' as const,
          playedAt: new Date('2024-06-02T10:00:00Z'),
          playlist: {
            playlistId: 'pl-uuid',
            title: 'Late Night Vibes',
            coverImage: 'https://example.com/cover.jpg',
            tracksCount: 14,
            owner: { userId: 'owner-uuid', username: 'owner', displayName: 'Owner' },
          },
        },
      ];
      trackRepo.findByUser.mockResolvedValue(rows);

      const result = await service.getRecentlyPlayed(mockUserId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('playlist');
    });
  });

  // ─── getListeningHistory ──────────────────────────────────────────────────────

  describe('getListeningHistory', () => {
    const mockPlay = (overrides?: object) => ({
      trackPlayId: 'play-uuid-1',
      playedAt: new Date('2024-06-02T12:00:00Z'),
      track: {
        trackId: 'track-uuid-1',
        title: 'Midnight Drive',
        coverImage: 'https://example.com/cover.jpg',
        durationSeconds: 213,
        genre: { genreId: 'genre-uuid', name: 'Electronic' },
        likesCount: 100,
        repostsCount: 20,
        playCount: 5000,
        commentsCount: 10,
        user: { userId: 'owner-uuid', username: 'dj_nour', displayName: 'Nour' },
      },
      ...overrides,
    });

    it('should return paginated history with mapped track fields', async () => {
      const plays = [mockPlay()];
      trackRepo.getListeningHistory.mockResolvedValue([plays, 1]);

      const result = await service.getListeningHistory(mockUserId);

      expect(trackRepo.getListeningHistory).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result.status).toBe('success');
      expect(result.data[0].track_play_id).toBe('play-uuid-1');
      expect(result.data[0].track.trackId).toBe('track-uuid-1');
      expect(result.data[0].track.owner.username).toBe('dj_nour');
    });

    it('should map genre correctly when genre exists', async () => {
      const plays = [mockPlay()];
      trackRepo.getListeningHistory.mockResolvedValue([plays, 1]);

      const result = await service.getListeningHistory(mockUserId);

      expect(result.data[0].track.genre).toEqual({ id: 'genre-uuid', name: 'Electronic' });
    });

    it('should map genre as null when track has no genre', async () => {
      const plays = [mockPlay({ track: { ...mockPlay().track, genre: null } })];
      trackRepo.getListeningHistory.mockResolvedValue([plays, 1]);

      const result = await service.getListeningHistory(mockUserId);

      expect(result.data[0].track.genre).toBeNull();
    });

    it('should use default page 1 and limit 10', async () => {
      trackRepo.getListeningHistory.mockResolvedValue([[], 0]);

      await service.getListeningHistory(mockUserId);

      expect(trackRepo.getListeningHistory).toHaveBeenCalledWith(mockUserId, 1, 10);
    });

    it('should cap limit at 50', async () => {
      trackRepo.getListeningHistory.mockResolvedValue([[], 0]);

      await service.getListeningHistory(mockUserId, 1, 200);

      expect(trackRepo.getListeningHistory).toHaveBeenCalledWith(mockUserId, 1, 50);
    });

    it('should include pagination metadata in response', async () => {
      trackRepo.getListeningHistory.mockResolvedValue([[], 47]);

      const result = await service.getListeningHistory(mockUserId, 2, 10);

      expect(result.pagination).toBeDefined();
      expect(result.pagination.totalCount).toBe(47);
      expect(result.pagination.currentPage).toBe(2);
    });
  });

  // ─── deleteUserHistory ────────────────────────────────────────────────────────

  describe('deleteUserHistory', () => {
    it('should call deleteUserHistory on repo and return success message', async () => {
      trackRepo.deleteUserHistory.mockResolvedValue(undefined);

      const result = await service.deleteUserHistory(mockUserId);

      expect(trackRepo.deleteUserHistory).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        status: 'success',
        message: 'Listening history and Recently Played cleared successfully',
      });
    });

    it('should propagate errors from repository', async () => {
      trackRepo.deleteUserHistory.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteUserHistory(mockUserId)).rejects.toThrow('DB error');
    });
  });
});
