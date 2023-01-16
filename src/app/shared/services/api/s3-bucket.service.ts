import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';
import { defer, forkJoin, merge, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { S3ClientService } from '~/app/shared/services/api/s3-client.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type S3Bucket = AWS.S3.Types.Bucket;

export type S3BucketAttributes = S3Bucket & {
  /* eslint-disable @typescript-eslint/naming-convention */
  TagSet?: AWS.S3.Types.TagSet;
  Versioning?: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Object = AWS.S3.Types.Object;

export type S3Objects = S3Object[];

export type S3UploadProgress = AWS.S3.Types.ManagedUpload.Progress & {
  sendData: AWS.S3.Types.ManagedUpload.SendData;
};

export type S3GetBucketTaggingOutput = AWS.S3.Types.GetBucketTaggingOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3DeleteObjectOutput = AWS.S3.Types.DeleteObjectOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3GetObjectOutput = AWS.S3.Types.GetObjectOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3HeadObjectOutput = AWS.S3.Types.HeadObjectOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3GetObjectTaggingOutput = AWS.S3.Types.GetObjectTaggingOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3PutObjectTaggingOutput = AWS.S3.Types.PutObjectTaggingOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3GetObjectAttributesOutput = S3HeadObjectOutput &
  S3GetObjectTaggingOutput & {
    /* eslint-disable @typescript-eslint/naming-convention */
    Bucket: AWS.S3.Types.BucketName;
    Key: AWS.S3.Types.ObjectKey;
    /* eslint-enable @typescript-eslint/naming-convention */
  };

/**
 * Service to handle buckets via the S3 API.
 */
@Injectable({
  providedIn: 'root'
})
export class S3BucketService {
  constructor(
    private authSessionService: AuthSessionService,
    private rgwService: RgwService,
    private s3ClientService: S3ClientService
  ) {}

  /**
   * Get the list of buckets.
   *
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listBuckets-property
   */
  public list(credentials?: Credentials): Observable<AWS.S3.Types.Buckets> {
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).listBuckets().promise()
    ).pipe(map((resp: AWS.S3.Types.ListBucketsOutput) => resp.Buckets!));
  }

  /**
   * Get the number of buckets.
   *
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public count(credentials?: Credentials): Observable<number> {
    return this.list(credentials).pipe(map((resp: AWS.S3.Types.Buckets) => resp.length));
  }

  /**
   * Get the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#get-bucket
   */
  public get(bucket: AWS.S3.Types.BucketName, credentials?: Credentials): Observable<S3Bucket> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: Record<string, any> = { 'max-keys': 0 };
    return this.rgwService.get<S3Bucket>(bucket, { credentials, params });
  }

  /**
   * Get the specified bucket attributes including tags and versioning
   * information.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public getAttributes(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<S3BucketAttributes> {
    return forkJoin({
      bucket: this.get(bucket, credentials),
      versioning: this.getVersioning(bucket, credentials),
      tagging: this.getTagging(bucket, credentials)
    }).pipe(
      map((resp) => {
        return {
          /* eslint-disable @typescript-eslint/naming-convention */
          ...resp.bucket,
          ...resp.tagging,
          Versioning: resp.versioning
          /* eslint-enable @typescript-eslint/naming-convention */
        };
      })
    );
  }

  /**
   * Check if the specified bucket exists.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headBucket-property
   */
  public exists(bucket: AWS.S3.Types.BucketName, credentials?: Credentials): Observable<boolean> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.HeadBucketRequest = { Bucket: bucket };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).headBucket(params).promise()
    ).pipe(
      map(() => true),
      catchError((error) => {
        if (_.isFunction(error.preventDefault)) {
          error.preventDefault();
        }
        return of(false);
      })
    );
  }

  /**
   * Create the specified bucket.
   *
   * @param bucket The bucket to create.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property
   */
  public create(bucket: S3BucketAttributes, credentials?: Credentials): Observable<S3Bucket> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.rgwService
      .put<AWS.S3.Types.CreateBucketOutput>(bucket.Name!, { credentials })
      .pipe(switchMap(() => this.update(bucket, credentials)));
  }

  /**
   * Update the specified bucket.
   *
   * @param bucket The bucket to update.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public update(
    bucket: Partial<S3BucketAttributes>,
    credentials?: Credentials
  ): Observable<S3Bucket> {
    // First get the original bucket data to find out what needs to be
    // updated.
    return this.get(bucket.Name!, credentials).pipe(
      switchMap((currentBucket: S3BucketAttributes) => {
        const sources = [];
        // Update the `versioning` flag?
        if (_.isBoolean(bucket.Versioning) && bucket.Versioning !== currentBucket.Versioning) {
          currentBucket.Versioning = bucket.Versioning;
          sources.push(this.setVersioning(bucket.Name!, bucket.Versioning, credentials));
        }
        // Update the tags?
        if (_.isArray(bucket.TagSet) && !_.isEqual(bucket.TagSet, currentBucket.TagSet)) {
          currentBucket.TagSet = bucket.TagSet;
          sources.push(this.setTagging(bucket.Name!, bucket.TagSet, credentials));
        }
        if (sources.length) {
          return forkJoin(sources).pipe(map(() => currentBucket));
        }
        return of(currentBucket);
      })
    );
  }

  /**
   * Delete the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteBucket-property
   */
  public delete(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<AWS.S3.Types.BucketName> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.DeleteBucketRequest = { Bucket: bucket };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).deleteBucket(params).promise()
    ).pipe(map(() => bucket));
  }

  /**
   * Get the versioning state of the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getBucketVersioning-property
   */
  public getVersioning(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<boolean> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.GetBucketVersioningRequest = { Bucket: bucket };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getBucketVersioning(params).promise()
    ).pipe(map((resp: AWS.S3.Types.GetBucketVersioningOutput) => resp.Status === 'Enabled'));
  }

  /**
   * Set the versioning state of the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param enabled Set to `true` to enable the versioning of the bucket.
   *   Defaults to `false`.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketVersioning-property
   */
  public setVersioning(
    bucket: AWS.S3.Types.BucketName,
    enabled: boolean = false,
    credentials?: Credentials
  ): Observable<void> {
    const params: AWS.S3.Types.PutBucketVersioningRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      VersioningConfiguration: { Status: enabled ? 'Enabled' : 'Suspended' }
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).putBucketVersioning(params).promise()
    ).pipe(map(() => void 0));
  }

  /**
   * Returns the tag set associated with the bucket.
   * Note, a `NoSuchTagSet` is caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getBucketTagging-property
   */
  public getTagging(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<S3GetBucketTaggingOutput> {
    const params: AWS.S3.Types.GetBucketTaggingRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getBucketTagging(params).promise()
    ).pipe(
      catchError((err) => {
        if (['NoSuchTagSetError', 'NoSuchTagSet'].includes(err.code)) {
          return of({
            /* eslint-disable @typescript-eslint/naming-convention */
            TagSet: []
            /* eslint-enable @typescript-eslint/naming-convention */
          });
        }
        return throwError(err);
      }),
      map((resp: AWS.S3.Types.GetBucketTaggingOutput) => _.merge(resp, params))
    );
  }

  /**
   * Sets the tags for a bucket.
   *
   * @param bucket The name of the bucket.
   * @param tags The list of tags to add.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketTagging-property
   */
  public setTagging(
    bucket: AWS.S3.Types.BucketName,
    tags: AWS.S3.Types.TagSet,
    credentials?: Credentials
  ): Observable<void> {
    const params: AWS.S3.Types.PutBucketTaggingRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Tagging: { TagSet: tags }
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).putBucketTagging(params).promise()
    ).pipe(map(() => void 0));
  }

  /**
   * Get the objects of the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
   */
  public listObjects(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<S3Objects> {
    return new Observable<S3Objects>((observer: any) => {
      const s3Client = this.s3ClientService.get(credentials);
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const params: AWS.S3.Types.ListObjectsV2Request = { Bucket: bucket };
      let aborted = false;
      (async () => {
        try {
          do {
            const resp = await s3Client.listObjectsV2(params).promise();
            params.ContinuationToken = resp.NextContinuationToken;
            observer.next(resp.Contents);
          } while (params.ContinuationToken && !aborted);
        } catch (error) {
          observer.error(error);
        }
        observer.complete();
      })();
      return () => (aborted = true);
    });
  }

  /**
   * Delete the specified object.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property
   */
  public deleteObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3DeleteObjectOutput> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.DeleteObjectRequest = { Bucket: bucket, Key: key };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).deleteObject(params).promise()
    ).pipe(map((resp: AWS.S3.Types.DeleteObjectOutput) => _.merge(resp, params)));
  }

  /**
   * Upload the given file.
   *
   * @param bucket The name of the bucket.
   * @param file The file to upload.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
   */
  public uploadObject(
    bucket: AWS.S3.Types.BucketName,
    file: File,
    credentials?: Credentials
  ): Observable<AWS.S3.Types.ManagedUpload.SendData> {
    const params: AWS.S3.Types.PutObjectRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: file.name,
      Body: file,
      ContentType: file.type
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).upload(params).promise()
    );
  }

  /**
   * Upload the given files in parallel.
   *
   * @param bucket The name of the bucket.
   * @param fileList The list of files to upload.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public uploadObjects(
    bucket: AWS.S3.Types.BucketName,
    fileList: FileList,
    credentials?: Credentials
  ): Observable<S3UploadProgress> {
    const sources: Observable<AWS.S3.Types.ManagedUpload.SendData>[] = [];
    _.forEach(fileList, (file: File) => sources.push(this.uploadObject(bucket, file, credentials)));
    return merge(...sources).pipe(
      map((sendData: AWS.S3.Types.ManagedUpload.SendData, index: number) => {
        return { loaded: index + 1, total: fileList.length, sendData };
      })
    );
  }

  /**
   * Get the specified object.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param optionalParams Optional parameters.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
   */
  public getObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    optionalParams?: Partial<AWS.S3.Types.GetObjectRequest>,
    credentials?: Credentials
  ): Observable<S3GetObjectOutput> {
    const params: AWS.S3.Types.GetObjectRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key,
      /* eslint-enable @typescript-eslint/naming-convention */
      ...optionalParams
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getObject(params).promise()
    ).pipe(
      map((resp: AWS.S3.Types.GetObjectOutput) => _.merge(resp, _.pick(params, ['Bucket', 'Key'])))
    );
  }

  /**
   * Retrieves metadata from an object without returning the object itself.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property
   */
  public headObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    optionalParams?: Partial<AWS.S3.Types.HeadObjectRequest>,
    credentials?: Credentials
  ): Observable<S3HeadObjectOutput> {
    const params: AWS.S3.Types.HeadObjectRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key,
      /* eslint-enable @typescript-eslint/naming-convention */
      ...optionalParams
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).headObject(params).promise()
    ).pipe(map((resp: AWS.S3.Types.HeadObjectOutput) => _.merge(resp, params)));
  }

  /**
   * Retrieves all the metadata from an object without returning the
   * object itself.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public getObjectAttributes(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectAttributesOutput> {
    return forkJoin({
      object: this.headObject(bucket, key, undefined, credentials),
      tagging: this.getObjectTagging(bucket, key, credentials)
    }).pipe(
      map((resp) => {
        return { ...resp.object, ...resp.tagging };
      })
    );
  }

  /**
   * Download the specified object.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public downloadObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectOutput> {
    return this.getObject(bucket, key, undefined, credentials).pipe(
      tap((resp: S3GetObjectOutput) => {
        // @ts-ignore
        const blob: Blob = new Blob([resp.Body!]);
        const filename: string = _.split(key, '/').slice(-1)[0];
        saveAs(blob, filename);
      })
    );
  }

  /**
   * Returns the tag-set of an object.
   * Note, a `NoSuchTagSet` is caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObjectTagging-property
   */
  public getObjectTagging(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectTaggingOutput> {
    const params: AWS.S3.Types.GetObjectTaggingRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getObjectTagging(params).promise()
    ).pipe(
      catchError((err) => {
        if (['NoSuchTagSetError', 'NoSuchTagSet'].includes(err.code)) {
          return of({
            /* eslint-disable @typescript-eslint/naming-convention */
            TagSet: []
            /* eslint-enable @typescript-eslint/naming-convention */
          });
        }
        return throwError(err);
      }),
      map((resp: AWS.S3.Types.GetObjectTaggingOutput) => _.merge(resp, params))
    );
  }

  /**
   * Sets the supplied tag-set to an object that already exists in a
   * bucket.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param tags The list of tags to add.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObjectTagging-property
   */
  public setObjectTagging(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    tags: AWS.S3.Types.TagSet,
    credentials?: Credentials
  ): Observable<S3PutObjectTaggingOutput> {
    const params: AWS.S3.Types.PutObjectTaggingRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key,
      Tagging: { TagSet: tags }
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).putObjectTagging(params).promise()
    ).pipe(map((resp: AWS.S3.Types.PutObjectTaggingOutput) => _.merge(resp, params)));
  }
}
