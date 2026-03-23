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
    const dto = { display_name: 'Test' };
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
    const dto = { is_public: false };
    service.updateMyPrivacy.mockResolvedValue({ status: 'Success', message: '', data: {} });

    await controller.updateMyPrivacy(mockUserId, dto);

    expect(service.updateMyPrivacy).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('isUsernameTaken → passes query param to service', async () => {
    service.isUsernameTaken.mockResolvedValue({ status: 'success', data: {} });

    await controller.isUsernameTaken({ username: 'testuser' } as any);

    expect(service.isUsernameTaken).toHaveBeenCalledWith('testuser');
  });
});
