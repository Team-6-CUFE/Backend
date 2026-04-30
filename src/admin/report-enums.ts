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

export enum Role {
  LISTENER = 'listener',
  ARTIST = 'artist',
  ADMIN = 'admin',
}
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}
