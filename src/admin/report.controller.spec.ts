import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { AdminService } from './admin.service';
import { CreateReportDto } from './dto/createReport.dto';
import { ReportStatus, ReportType, ReportReason } from './report-enums';

describe('ReportController', () => {
  let controller: ReportController;
  let adminService: jest.Mocked<AdminService>;

  const mockAdminService = {
    addReport: jest.fn(),
    getAllReports: jest.fn(),
    deleteReport: jest.fn(),
    updateReportStatus: jest.fn(),
    getReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<ReportController>(ReportController);
    adminService = module.get(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addReport', () => {
    it('should call adminService.addReport with userId and dto', async () => {
      const userId = 'user-123';
      const dto: CreateReportDto = {
        type: ReportType.TRACK,
        targetId: 'track-123',
        reason: ReportReason.COPYRIGHT,
        description: 'Stolen track',
      };
      const mockResult = { status: 'success', message: 'Report submitted successfully', data: {} };
      mockAdminService.addReport.mockResolvedValue(mockResult);

      const result = await controller.addReport(userId, dto);

      expect(adminService.addReport).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getAllReports', () => {
    it('should call adminService.getAllReports with page and limit', async () => {
      const mockResult = {
        status: 'success',
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockAdminService.getAllReports.mockResolvedValue(mockResult);

      const result = await controller.getAllReports('user-123', 1, 20);

      expect(adminService.getAllReports).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteReport', () => {
    it('should call adminService.deleteReport with reportId', async () => {
      const reportId = 'report-123';
      const mockResult = { status: 'success', message: 'report deleted successfully' };
      mockAdminService.deleteReport.mockResolvedValue(mockResult);

      const result = await controller.deleteReport(reportId);

      expect(adminService.deleteReport).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateReportStatus', () => {
    it('should call adminService.updateReportStatus with status and reportId', async () => {
      const reportId = 'report-123';
      const status = ReportStatus.RESOLVED;
      const mockResult = { status: 'success', message: 'Report status updated successfully' };
      mockAdminService.updateReportStatus.mockResolvedValue(mockResult);

      const result = await controller.updateReportStatus(status, reportId);

      expect(adminService.updateReportStatus).toHaveBeenCalledWith(status, reportId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getReport', () => {
    it('should call adminService.getReport with reportId', async () => {
      const reportId = 'report-123';
      const mockResult = { status: 'success', data: { reportId, type: ReportType.TRACK } };
      mockAdminService.getReport.mockResolvedValue(mockResult);

      const result = await controller.getReport(reportId);

      expect(adminService.getReport).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockResult);
    });
  });
});
