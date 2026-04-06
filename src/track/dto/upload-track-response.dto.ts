export class UploadTrackResponseDto {
  status!: string;

  message!: string;

  data!: {
    trackId: string;
    title: string;
    trackStatus: string;
    createdAt: Date;
  };
}
