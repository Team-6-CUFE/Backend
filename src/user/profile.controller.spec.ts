import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { mockProfileService, mockUserId, mockUsername } from './test/user.mock';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: ReturnType<typeof mockProfileService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useFactory: mockProfileService }],
    }).compile();

    controller = module.get(ProfileController);
    service = module.get(ProfileService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findMyProfile → delegates to service with userId', async () => {
    service.findMyProfile.mockResolvedValue({ status: 'Success', data: {} });

    await controller.findMyProfile(mockUserId);

    expect(service.findMyProfile).toHaveBeenCalledWith(mockUserId);
  });

  it('findProfile → delegates to service with username param', async () => {
    service.findProfile.mockResolvedValue({ status: 'Success', data: {} });

    await controller.findProfile(mockUsername);

    expect(service.findProfile).toHaveBeenCalledWith(mockUsername);
  });

  it('updateMyProfile → delegates to service with userId and dto', async () => {
    const dto = { displayName: 'Test' };
    service.updateProfile.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateMyProfile(mockUserId, dto as any);

    expect(service.updateProfile).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('updateMyBirthdate → delegates correctly', async () => {
    const dto = { birthdate: '1998-01-01' };
    service.updateMyBirthdate.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateMyBirthdate(mockUserId, dto);

    expect(service.updateMyBirthdate).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('updateMyGender → delegates correctly', async () => {
    const dto = { gender: 'male' };
    service.updateMyGender.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateMyGender(mockUserId, dto);

    expect(service.updateMyGender).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('updateMyPrivacy → delegates correctly', async () => {
    const dto = { isPublic: false };
    service.updateMyPrivacy.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateMyPrivacy(mockUserId, dto);

    expect(service.updateMyPrivacy).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('isUsernameTaken → passes query param to service', async () => {
    service.isUsernameTaken.mockResolvedValue({ status: 'success', data: {} });

    await controller.isUsernameTaken({ username: 'testuser' } as any);

    expect(service.isUsernameTaken).toHaveBeenCalledWith('testuser');
  });

  it('getMyExternalProfiles → delegates to service with userId', async () => {
    service.getMyExternalProfiles.mockResolvedValue({ status: 'Success', data: [] });

    await controller.getMyExternalProfiles(mockUserId);

    expect(service.getMyExternalProfiles).toHaveBeenCalledWith(mockUserId);
  });

  it('addExternalProfile → delegates to service with userId and dto', async () => {
    const dto = { name: 'instagram', url: 'https://instagram.com/test' };
    service.addExternalProfile.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.addExternalProfile(mockUserId, dto as any);

    expect(service.addExternalProfile).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('updateExternalProfile → delegates to service with userId, profileId, and dto', async () => {
    const profileId = 'profile-uuid-1';
    const dto = { name: 'twitter' };
    service.updateExternalProfile.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateExternalProfile(mockUserId, profileId, dto as any);

    expect(service.updateExternalProfile).toHaveBeenCalledWith(mockUserId, profileId, dto);
  });

  it('deleteExternalProfile → delegates to service with userId and profileId', async () => {
    const profileId = 'profile-uuid-1';
    service.deleteExternalProfile.mockResolvedValue({
      status: 'Success',
      message: 'External profile deleted successfully',
    });

    await controller.deleteExternalProfile(mockUserId, profileId);

    expect(service.deleteExternalProfile).toHaveBeenCalledWith(mockUserId, profileId);
  });

  it('updateAvatar → delegates to service with userId and avatarUrl', async () => {
    const dto = { avatarUrl: 'https://cdn.example.com/avatars/test.jpg' };
    service.updateAvatar.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateAvatar(mockUserId, dto as any);

    expect(service.updateAvatar).toHaveBeenCalledWith(mockUserId, dto.avatarUrl);
  });

  it('updateCover → delegates to service with userId and coverPhoto', async () => {
    const dto = { coverPhoto: 'https://cdn.example.com/covers/test.jpg' };
    service.updateCover.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateCover(mockUserId, dto as any);

    expect(service.updateCover).toHaveBeenCalledWith(mockUserId, dto.coverPhoto);
  });

  // ─── getRecentlyPlayed ────────────────────────────────────────────────────────

  it('getRecentlyPlayed → delegates to service with userId', async () => {
    const mockData = [{ type: 'artist', playedAt: new Date(), artist: {} }];
    service.getRecentlyPlayed.mockResolvedValue({ status: 'success', data: mockData });

    await controller.getRecentlyPlayed(mockUserId);

    expect(service.getRecentlyPlayed).toHaveBeenCalledWith(mockUserId);
  });

  it('getRecentlyPlayed → returns service response', async () => {
    const expected = { status: 'success', data: [] };
    service.getRecentlyPlayed.mockResolvedValue(expected);

    const result = await controller.getRecentlyPlayed(mockUserId);

    expect(result).toBe(expected);
  });

  // ─── getListeningHistory ──────────────────────────────────────────────────────

  it('getListeningHistory → delegates to service with userId, page, and limit', async () => {
    service.getListeningHistory.mockResolvedValue({ status: 'success', data: [], pagination: {} });

    await controller.getListeningHistory(mockUserId, 2, 20);

    expect(service.getListeningHistory).toHaveBeenCalledWith(mockUserId, 2, 20);
  });

  it('getListeningHistory → returns service response', async () => {
    const expected = {
      status: 'success',
      data: [{ track_play_id: 'p1' }],
      pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 10 },
    };
    service.getListeningHistory.mockResolvedValue(expected);

    const result = await controller.getListeningHistory(mockUserId, 1, 10);

    expect(result).toBe(expected);
  });

  // ─── deleteUserHistory ────────────────────────────────────────────────────────

  it('deleteUserHistory → delegates to service with userId', async () => {
    service.deleteUserHistory.mockResolvedValue({
      status: 'success',
      message: 'Listening history and Recently Played cleared successfully',
    });

    await controller.deleteUserHistory(mockUserId);

    expect(service.deleteUserHistory).toHaveBeenCalledWith(mockUserId);
  });

  it('deleteUserHistory → returns success message', async () => {
    const expected = {
      status: 'success',
      message: 'Listening history and Recently Played cleared successfully',
    };
    service.deleteUserHistory.mockResolvedValue(expected);

    const result = await controller.deleteUserHistory(mockUserId);

    expect(result).toBe(expected);
  });
});
