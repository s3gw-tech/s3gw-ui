export type Bucket = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Name: string;
  CreationDate?: string;
  IsTruncated?: boolean;
  Marker?: string;
  MaxKeys?: number;
  Prefix?: string;
  /* eslint-enable @typescript-eslint/naming-convention */
};
