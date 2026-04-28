export enum ReportType {
  USER = 'user',
  TRACK = 'track',
  COMMENT = 'comment',
}

export enum ReportReason {
  COPYRIGHT = 'copyright',
  INAPPROPRIATE = 'inappropriate',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}
