import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface TrackProgressEvent {
  event: 'progress' | 'completed' | 'failed';
  data: Record<string, unknown>;
}

@Injectable()
export class TrackSseService implements OnModuleDestroy {
  private readonly subjects = new Map<string, Subject<MessageEvent>>();

  /** Returns (or creates) a hot Observable for the given trackId. */
  getStream(trackId: string): Observable<MessageEvent> {
    if (!this.subjects.has(trackId)) {
      this.subjects.set(trackId, new Subject<MessageEvent>());
    }
    return this.subjects.get(trackId)!.asObservable();
  }

  emit(trackId: string, payload: TrackProgressEvent): void {
    const subject = this.subjects.get(trackId);
    if (!subject) return;
    subject.next({ data: payload } as MessageEvent);
  }

  complete(trackId: string): void {
    const subject = this.subjects.get(trackId);
    if (!subject) return;
    subject.complete();
    this.subjects.delete(trackId);
  }

  onModuleDestroy(): void {
    Array.from(this.subjects.values()).forEach((subject) => subject.complete());
    this.subjects.clear();
  }
}
