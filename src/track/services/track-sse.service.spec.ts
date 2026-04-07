import { TrackSseService } from './track-sse.service';

describe('TrackSseService', () => {
  let service: TrackSseService;

  beforeEach(() => {
    service = new TrackSseService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  // ─── getStream ────────────────────────────────────────────────────────────────

  describe('getStream', () => {
    it('should create a new subject and return an observable for a new trackId', () => {
      const stream = service.getStream('track-1');

      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });

    it('should return the same observable for the same trackId', () => {
      const stream1 = service.getStream('track-1');
      const stream2 = service.getStream('track-1');

      // Both should emit from the same subject
      const received: any[] = [];
      stream1.subscribe((e) => received.push(e));
      stream2.subscribe((e) => received.push(e));

      service.emit('track-1', { event: 'progress', data: { progress: 50 } });

      expect(received).toHaveLength(2);
    });

    it('should create independent subjects for different trackIds', () => {
      const received1: any[] = [];
      const received2: any[] = [];

      service.getStream('track-1').subscribe((e) => received1.push(e));
      service.getStream('track-2').subscribe((e) => received2.push(e));

      service.emit('track-1', { event: 'progress', data: { progress: 10 } });

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(0);
    });
  });

  // ─── emit ─────────────────────────────────────────────────────────────────────

  describe('emit', () => {
    it('should push event to subscribers of the correct trackId', () => {
      const received: any[] = [];
      service.getStream('track-1').subscribe((e) => received.push(e));

      service.emit('track-1', { event: 'progress', data: { trackId: 'track-1', progress: 42 } });

      expect(received).toHaveLength(1);
      expect(received[0].data).toEqual({
        event: 'progress',
        data: { trackId: 'track-1', progress: 42 },
      });
    });

    it('should do nothing when no subject exists for the trackId', () => {
      expect(() => service.emit('nonexistent', { event: 'progress', data: {} })).not.toThrow();
    });

    it('should not emit to subscribers of a different trackId', () => {
      const received: any[] = [];
      service.getStream('track-2').subscribe((e) => received.push(e));

      service.emit('track-1', { event: 'progress', data: {} });

      expect(received).toHaveLength(0);
    });

    it('should wrap payload in { data: payload } as MessageEvent', () => {
      const received: any[] = [];
      const payload = {
        event: 'completed' as const,
        data: { trackId: 'track-1', audioUrl: 'url' },
      };
      service.getStream('track-1').subscribe((e) => received.push(e));

      service.emit('track-1', payload);

      expect(received[0]).toEqual({ data: payload });
    });
  });

  // ─── complete ─────────────────────────────────────────────────────────────────

  describe('complete', () => {
    it('should complete the observable and remove the subject', () => {
      let completed = false;
      service.getStream('track-1').subscribe({
        complete: () => {
          completed = true;
        },
      });

      service.complete('track-1');

      expect(completed).toBe(true);
    });

    it('should not emit after complete is called', () => {
      const received: any[] = [];
      service.getStream('track-1').subscribe((e) => received.push(e));

      service.complete('track-1');
      service.emit('track-1', { event: 'progress', data: {} });

      expect(received).toHaveLength(0);
    });

    it('should do nothing when no subject exists for the trackId', () => {
      expect(() => service.complete('nonexistent')).not.toThrow();
    });

    it('should remove the subject after completing so a new getStream creates a fresh one', () => {
      const received1: any[] = [];
      const received2: any[] = [];

      service.getStream('track-1').subscribe((e) => received1.push(e));
      service.complete('track-1');

      service.getStream('track-1').subscribe((e) => received2.push(e));
      service.emit('track-1', { event: 'progress', data: {} });

      expect(received1).toHaveLength(0);
      expect(received2).toHaveLength(1);
    });
  });

  // ─── onModuleDestroy ──────────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('should complete all active subjects', () => {
      const completed: string[] = [];

      service.getStream('track-1').subscribe({ complete: () => completed.push('track-1') });
      service.getStream('track-2').subscribe({ complete: () => completed.push('track-2') });

      service.onModuleDestroy();

      expect(completed).toContain('track-1');
      expect(completed).toContain('track-2');
    });

    it('should clear all subjects on destroy', () => {
      service.getStream('track-1');
      service.getStream('track-2');

      service.onModuleDestroy();

      // After destroy, emitting should do nothing (no subjects)
      expect(() => service.emit('track-1', { event: 'progress', data: {} })).not.toThrow();
    });

    it('should work with no active subjects', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
