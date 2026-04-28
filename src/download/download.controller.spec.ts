import { Test, TestingModule } from '@nestjs/testing';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';

describe('DownloadController', () => {
  let controller: DownloadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [
        {
          provide: DownloadService,
          useValue: {
            // Mock only the methods your controller calls
            isTrackDownloadable: jest.fn(),
            saveDownloadedTrack: jest.fn(),
            downloadTrackFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DownloadController>(DownloadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
