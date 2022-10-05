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

export type BucketListResponse = [
  /* eslint-disable @typescript-eslint/naming-convention */
  {
    ID: string;
    DisplayName: string;
  },
  Array<{
    Name: string;
    CreationDate: string;
  }>
  /* eslint-enable @typescript-eslint/naming-convention */
];

export type CreateBucketResponse = {
  /* eslint-disable @typescript-eslint/naming-convention */
  bucket_info: {
    bucket: {
      bucket_id: string;
      marker: string;
      name: string;
      tenant: string;
      // ... more fields (we are not interested in)
    };
    creation_time: string;
    owner: string;
    // ... more fields (we are not interested in)
  };
  entry_point_object_ver: {
    tag: string;
    ver: number;
  };
  object_ver: {
    tag: string;
    ver: number;
  };
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type VersioningResponse = {
  /* eslint-disable @typescript-eslint/naming-convention */
  MfaDelete: 'Enabled' | 'Disabled';
  Status: 'Enabled' | 'Suspended';
  /* eslint-enable @typescript-eslint/naming-convention */
};
