import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { LegalController } from './legal.controller';

const mockRes = () => {
  const res = { send: jest.fn() } as unknown as Response;
  return res;
};

describe('LegalController', () => {
  let controller: LegalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
    }).compile();

    controller = module.get<LegalController>(LegalController);
  });

  describe('privacy', () => {
    it('should call res.send with HTML containing Privacy Policy title', () => {
      const res = mockRes();

      controller.privacy(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('Privacy Policy');
    });

    it('should return valid HTML document', () => {
      const res = mockRes();

      controller.privacy(res);

      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include the app name Harmonica', () => {
      const res = mockRes();

      controller.privacy(res);

      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('Harmonica');
    });

    it('should include contact email', () => {
      const res = mockRes();

      controller.privacy(res);

      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('support@harmonica.app');
    });
  });

  describe('terms', () => {
    it('should call res.send with HTML containing Terms of Service title', () => {
      const res = mockRes();

      controller.terms(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('Terms of Service');
    });

    it('should return valid HTML document', () => {
      const res = mockRes();

      controller.terms(res);

      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include the app name Harmonica', () => {
      const res = mockRes();

      controller.terms(res);

      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('Harmonica');
    });

    it('should include contact email', () => {
      const res = mockRes();

      controller.terms(res);

      const html = (res.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).toContain('support@harmonica.app');
    });
  });
});
