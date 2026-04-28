import { Test, TestingModule } from '@nestjs/testing';
import { DownloadService } from './download.service';
import { TrackRepository } from '../track/track.repository';
import { DownloadRepository } from './download.repository';

describe('DownloadService', () => {
  let service: DownloadService;
  let trackRepository: TrackRepository;
  let downloadRepository: DownloadRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        {
          provide: TrackRepository,
          useValue: {
            findOne: jest.fn(),
            // add other methods you call from DownloadService
          },
        },
        {
          provide: DownloadRepository,
          useValue: {
            saveDownloadedTrack: jest.fn(),
            // add other methods you call
          },
        },
      ],
    }).compile();

    service = module.get<DownloadService>(DownloadService);
    trackRepository = module.get<TrackRepository>(TrackRepository);
    downloadRepository = module.get<DownloadRepository>(DownloadRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(trackRepository).toBeDefined();
    expect(downloadRepository).toBeDefined();
  });
});
