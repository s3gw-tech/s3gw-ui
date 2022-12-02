import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';
import { defer, merge, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { S3ClientService } from '~/app/shared/services/api/s3-client.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type S3Bucket = AWS.S3.Types.Bucket & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Versioning?: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Object = AWS.S3.Types.Object & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Type: 'DIRECTORY' | 'FILE';
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Objects = S3Object[];

export type S3UploadProgress = AWS.S3.Types.ManagedUpload.Progress & {
  sendData: AWS.S3.Types.ManagedUpload.SendData;
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
    return this.rgwService.get<S3Bucket>(`${bucket}`, { credentials, params }).pipe(
      switchMap((resp: S3Bucket) =>
        this.isVersioning(resp.Name!, credentials).pipe(
          map((enabled: boolean) => {
            resp.Versioning = enabled;
            return resp;
          })
        )
      )
    );
  }

  /**
   * Check if the specified bucket exists.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public exists(bucket: AWS.S3.Types.BucketName, credentials?: Credentials): Observable<boolean> {
    return this.get(bucket, credentials).pipe(
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
  public create(
    bucket: S3Bucket,
    credentials?: Credentials
  ): Observable<AWS.S3.Types.CreateBucketOutput> {
    // const params: AWS.S3.Types.CreateBucketRequest = {
    //   /* eslint-disable @typescript-eslint/naming-convention */
    //   Bucket: bucket.Name!,
    //   CreateBucketConfiguration: {
    //     LocationConstraint: ''
    //   }
    //   /* eslint-enable @typescript-eslint/naming-convention */
    // };
    // return defer(() =>
    //   // Note, we need to convert the hot promise to a cold observable.
    //   this.s3ClientService.get(credentials).createBucket(params).promise()
    // ).pipe(
    //   switchMap((resp: AWS.S3.Types.CreateBucketOutput) => {
    //     // Update the `versioning` flag.
    //     if (bucket.Versioning) {
    //       // eslint-disable-next-line no-underscore-dangle
    //       return this.setVersioning(bucket.Name!, true, credentials).pipe(
    //         map((): AWS.S3.Types.CreateBucketOutput => resp)
    //       );
    //     }
    //     return of(resp);
    //   })
    // );
    return this.rgwService
      .put<AWS.S3.Types.CreateBucketOutput>(bucket.Name!, {
        credentials: credentials ?? this.authSessionService.getCredentials()
      })
      .pipe(
        switchMap((resp: AWS.S3.Types.CreateBucketOutput) => {
          // Update the `versioning` flag.
          if (bucket.Versioning) {
            // eslint-disable-next-line no-underscore-dangle
            return this.setVersioning(bucket.Name!, true, credentials).pipe(
              map((): AWS.S3.Types.CreateBucketOutput => resp)
            );
          }
          return of(resp);
        })
      );
  }

  /**
   * Update the specified bucket.
   *
   * @param bucket The bucket to update.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public update(bucket: Partial<S3Bucket>, credentials?: Credentials): Observable<S3Bucket> {
    // First get the original bucket data to find out what needs to be
    // updated.
    return this.get(bucket.Name!, credentials).pipe(
      switchMap((currentBucket: S3Bucket) => {
        if (_.isBoolean(bucket.Versioning) && bucket.Versioning !== currentBucket.Versioning) {
          currentBucket.Versioning = bucket.Versioning;
          return this.setVersioning(bucket.Name!, bucket.Versioning, credentials).pipe(
            map((): S3Bucket => currentBucket)
          );
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
  public isVersioning(
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
    ).pipe(map((res) => _.merge(res, params)));
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
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
   */
  public getObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectOutput> {
    const params: AWS.S3.Types.GetObjectRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getObject(params).promise()
    ).pipe(map((res) => _.merge(res, params)));
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
    return this.getObject(bucket, key, credentials).pipe(
      tap((res: S3GetObjectOutput) => {
        // @ts-ignore
        const blob: Blob = new Blob([res.Body!]);
        const filename: string = _.split(key, '/').slice(-1)[0];
        saveAs(blob, filename);
      })
    );
  }
}
