import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, HttpException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from './user.repository';
import { GenreRepository } from '../genre/genre.repository';
import { UsernameAvailabilityService } from './username-availability.service';
import { ExternalProfileRepository } from './external-profile.repository';
import { StorageService } from '../common/storage_service';
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
} from './test/user.mock';

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let genreRepo: ReturnType<typeof mockGenreRepository>;
  let usernameAvailability: ReturnType<typeof mockUsernameAvailabilityService>;
  let storageService: ReturnType<typeof mockStorageService>;
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
      ],
    }).compile();

    service = module.get(ProfileService);
    userRepo = module.get(UserRepository);
    genreRepo = module.get(GenreRepository);
    usernameAvailability = module.get(UsernameAvailabilityService);
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
});
