import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'node:fs';
import { StorageService } from './storage_service';

// ─── AWS SDK mock ─────────────────────────────────────────────────────────────

const mockUploadPromise = jest.fn();
const mockDeleteObjectPromise = jest.fn();
const mockGetObjectPromise = jest.fn();

const mockS3Instance = {
  upload: jest.fn().mockReturnValue({ promise: mockUploadPromise }),
  deleteObject: jest.fn().mockReturnValue({ promise: mockDeleteObjectPromise }),
  getObject: jest.fn().mockReturnValue({ promise: mockGetObjectPromise }),
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => mockS3Instance),
}));

// ─── fs mock ──────────────────────────────────────────────────────────────────

jest.mock('node:fs', () => ({ writeFileSync: jest.fn() }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    process.env.AWS_S3_BUCKET = 'test-bucket';
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── uploadFile ─────────────────────────────────────────────────────────────

  describe('uploadFile', () => {
    const mockFile = {
      buffer: Buffer.from('file content'),
      originalname: 'test-file.mp3',
      mimetype: 'audio/mpeg',
    } as Express.Multer.File;

    it('should call s3.upload with correct params and return the result', async () => {
      const mockResult = { Location: 'https://s3.amazonaws.com/test-bucket/test-file.mp3' };
      mockUploadPromise.mockResolvedValue(mockResult);

      const result = await service.uploadFile(mockFile);

      expect(mockS3Instance.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: mockFile.originalname,
        Body: mockFile.buffer,
        ContentType: mockFile.mimetype,
        ContentDisposition: 'inline',
      });
      expect(result).toBe(mockResult);
    });

    it('should propagate errors from s3.upload', async () => {
      const error = new Error('S3 upload failed');
      mockUploadPromise.mockRejectedValue(error);

      await expect(service.uploadFile(mockFile)).rejects.toThrow('S3 upload failed');
    });
  });

  // ─── deleteFile ─────────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('should extract key from URL and call s3.deleteObject with correct params', async () => {
      mockDeleteObjectPromise.mockResolvedValue({});
      const url = 'https://test-bucket.s3.amazonaws.com/audio/track.mp3';

      await service.deleteFile(url);

      expect(mockS3Instance.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'audio/track.mp3',
      });
    });

    it('should NOT throw when s3.deleteObject rejects (non-fatal)', async () => {
      mockDeleteObjectPromise.mockRejectedValue(new Error('Access denied'));
      const url = 'https://test-bucket.s3.amazonaws.com/audio/track.mp3';

      await expect(service.deleteFile(url)).resolves.not.toThrow();
    });

    it('should handle URL-encoded keys using decodeURIComponent', async () => {
      mockDeleteObjectPromise.mockResolvedValue({});
      const url = 'https://test-bucket.s3.amazonaws.com/audio/my%20track%20file.mp3';

      await service.deleteFile(url);

      expect(mockS3Instance.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'audio/my track file.mp3',
      });
    });
  });

  // ─── downloadToTemp ─────────────────────────────────────────────────────────

  describe('downloadToTemp', () => {
    it('should call s3.getObject with correct params then write the body to tempPath', async () => {
      const body = Buffer.from('audio data');
      mockGetObjectPromise.mockResolvedValue({ Body: body });
      const url = 'https://test-bucket.s3.amazonaws.com/audio/track.mp3';
      const tempPath = 'C:\\temp\\track.mp3';

      await service.downloadToTemp(url, tempPath);

      expect(mockS3Instance.getObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'audio/track.mp3',
      });
      expect(fs.writeFileSync as jest.Mock).toHaveBeenCalledWith(tempPath, body);
    });

    it('should propagate errors from s3.getObject (fatal)', async () => {
      mockGetObjectPromise.mockRejectedValue(new Error('NoSuchKey'));
      const url = 'https://test-bucket.s3.amazonaws.com/audio/missing.mp3';

      await expect(service.downloadToTemp(url, 'C:\\temp\\missing.mp3')).rejects.toThrow(
        'NoSuchKey'
      );
    });
  });
});
