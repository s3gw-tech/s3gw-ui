/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';
import { defer, forkJoin, from, merge, Observable, of, Subscriber, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { isEqualOrUndefined } from '~/app/functions.helper';
import { Credentials } from '~/app/shared/models/credentials.type';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { S3ClientService } from '~/app/shared/services/api/s3-client.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

// eslint-disable-next-line @typescript-eslint/naming-convention,prefer-arrow/prefer-arrow-functions
function CatchInvalidRequest() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalFn = descriptor.value;
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    descriptor.value = function (...args: any[]) {
      // @ts-ignore
      const result: Observable<any> = originalFn.apply(this, args);
      return result.pipe(
        catchError((err) => {
          if (['InvalidRequest'].includes(err.code)) {
            // @ts-ignore
            this.notificationService.showError(_.capitalize(_.trimEnd(err.message), '.') + '.');
          }
          return throwError(err);
        })
      );
    };
    return descriptor;
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention,prefer-arrow/prefer-arrow-functions
function CatchAuthErrors() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalFn = descriptor.value;
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    descriptor.value = function (...args: any[]) {
      // @ts-ignore
      const result: Observable<any> = originalFn.apply(this, args);
      return result.pipe(
        catchError((err) => {
          if (
            ['CredentialsError', 'InvalidAccessKeyId', 'SignatureDoesNotMatch'].includes(err.code)
          ) {
            // @ts-ignore
            this.authSessionService.logout();
          }
          return throwError(err);
        })
      );
    };
    return descriptor;
  };
}

export type S3Bucket = AWS.S3.Types.Bucket;

export type S3BucketObjectLockConfiguration = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ObjectLockEnabled?: boolean;
  RetentionEnabled?: boolean;
  RetentionMode?: AWS.S3.Types.ObjectLockRetentionMode;
  RetentionValidity?: number;
  RetentionUnit?: 'Days' | 'Years';
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3BucketAttributes = S3Bucket &
  S3BucketObjectLockConfiguration & {
    /* eslint-disable @typescript-eslint/naming-convention */
    TagSet?: AWS.S3.Types.TagSet;
    VersioningEnabled?: boolean;
    /* eslint-enable @typescript-eslint/naming-convention */
  };

export type S3Object = AWS.S3.Types.Object & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Name: string;
  Type: 'OBJECT' | 'FOLDER';
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Objects = S3Object[];

export type S3UploadProgress = AWS.S3.Types.ManagedUpload.Progress & {
  sendData: AWS.S3.Types.ManagedUpload.SendData;
};

export type S3GetObjectLockConfigurationOutput = S3BucketObjectLockConfiguration & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3PutObjectLockConfigurationOutput = AWS.S3.Types.PutObjectLockConfigurationOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  /* eslint-enable @typescript-eslint/naming-convention */
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

export type S3PutObjectOutput = AWS.S3.Types.PutObjectOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3GetObjectRetentionOutput = AWS.S3.Types.GetObjectRetentionOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3GetObjectLegalHoldOutput = AWS.S3.Types.GetObjectLegalHoldOutput & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: AWS.S3.Types.BucketName;
  Key: AWS.S3.Types.ObjectKey;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3PutObjectLegalHoldOutput = AWS.S3.Types.PutObjectLegalHoldOutput & {
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
    private notificationService: NotificationService,
    private rgwService: RgwService,
    private rgwServiceConfigService: RgwServiceConfigService,
    private s3ClientService: S3ClientService
  ) {}

  get delimiter(): string {
    return this.rgwServiceConfigService.config.delimiter;
  }

  /**
   * Helper method to build a prefix from parts using the
   * configured delimiter.
   *
   * @param parts The prefix parts.
   * @param trailingDelimiter If `true`, a delimiter will be appended.
   *  Defaults to `false`.
   */
  public buildPrefix(parts: string[], trailingDelimiter = false): AWS.S3.Types.Prefix {
    const result: string = parts.length ? _.join(parts, this.delimiter) : '';
    return result.length && trailingDelimiter ? `${result}${this.delimiter}` : result;
  }

  /**
   * Helper method to build a valid object key using the configured
   * delimiter.
   *
   * @param key The object key.
   * @param prefix The optional prefix.
   */
  public buildKey(
    key: AWS.S3.Types.ObjectKey,
    prefix?: AWS.S3.Types.Prefix | string[]
  ): AWS.S3.Types.ObjectKey {
    const parts = this.splitKey(key);
    if (_.isString(prefix) && prefix.length) {
      prefix = this.splitKey(prefix);
    }
    if (_.isArray(prefix)) {
      parts.unshift(...prefix);
    }
    return _.join(parts, this.delimiter);
  }

  /**
   * Helper method to split an object key into its parts using the
   * configured delimiter.
   *
   * @param key The object key.
   * @return An array of strings.
   */
  public splitKey(key: AWS.S3.Types.ObjectKey): string[] {
    if (!key.length) {
      return [];
    }
    const parts: string[] = _.split(_.trim(key, this.delimiter), this.delimiter);
    _.remove(parts, _.isEmpty);
    return parts;
  }

  /**
   * Get the list of buckets.
   *
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listBuckets-property
   */
  @CatchAuthErrors()
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
  @CatchAuthErrors()
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
  @CatchAuthErrors()
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
  @CatchAuthErrors()
  public getAttributes(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<S3BucketAttributes> {
    return forkJoin({
      bucket: this.get(bucket, credentials),
      versioning: this.getVersioning(bucket, credentials),
      tagging: this.getTagging(bucket, credentials),
      locking: this.getObjectLocking(bucket, credentials)
    }).pipe(
      map((resp) => {
        return {
          /* eslint-disable @typescript-eslint/naming-convention */
          ...resp.bucket,
          ...resp.tagging,
          VersioningEnabled: resp.versioning,
          ...resp.locking
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
      catchError((err) => {
        if (_.isFunction(err.preventDefault)) {
          err.preventDefault();
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
  @CatchAuthErrors()
  public create(bucket: S3BucketAttributes, credentials?: Credentials): Observable<S3Bucket> {
    const params: AWS.S3.Types.CreateBucketRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket.Name!,
      CreateBucketConfiguration: { LocationConstraint: '' },
      ObjectLockEnabledForBucket: _.defaultTo(bucket.ObjectLockEnabled, false)
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).createBucket(params).promise()
    ).pipe(switchMap(() => this.update(bucket, credentials)));
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
    return this.getAttributes(bucket.Name!, credentials).pipe(
      switchMap((currentBucket: S3BucketAttributes) => {
        const sources = [];
        // Update versioning?
        if (!isEqualOrUndefined(bucket.VersioningEnabled, currentBucket.VersioningEnabled)) {
          currentBucket.VersioningEnabled = bucket.VersioningEnabled;
          sources.push(this.setVersioning(bucket.Name!, bucket.VersioningEnabled, credentials));
        }
        // Update the tags?
        if (_.isArray(bucket.TagSet) && !isEqualOrUndefined(bucket.TagSet, currentBucket.TagSet)) {
          currentBucket.TagSet = bucket.TagSet;
          sources.push(this.setTagging(bucket.Name!, bucket.TagSet, credentials));
        }
        // Update object locking?
        if (
          currentBucket.ObjectLockEnabled === true &&
          (!isEqualOrUndefined(bucket.RetentionEnabled, currentBucket.RetentionEnabled) ||
            !isEqualOrUndefined(bucket.RetentionMode, currentBucket.RetentionMode) ||
            !isEqualOrUndefined(bucket.RetentionValidity, currentBucket.RetentionValidity) ||
            !isEqualOrUndefined(bucket.RetentionUnit, currentBucket.RetentionUnit))
        ) {
          const objectLockConfiguration: S3BucketObjectLockConfiguration = {
            /* eslint-disable @typescript-eslint/naming-convention */
            ObjectLockEnabled: true,
            RetentionEnabled: true,
            RetentionMode: bucket.RetentionMode,
            RetentionValidity: bucket.RetentionValidity,
            RetentionUnit: bucket.RetentionUnit
            /* eslint-enable @typescript-eslint/naming-convention */
          };
          currentBucket.RetentionEnabled = bucket.RetentionEnabled;
          currentBucket.RetentionMode = bucket.RetentionMode;
          currentBucket.RetentionValidity = bucket.RetentionValidity;
          currentBucket.RetentionUnit = bucket.RetentionUnit;
          sources.push(this.setObjectLocking(bucket.Name!, objectLockConfiguration, credentials));
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
  @CatchAuthErrors()
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
   * Get the Object Lock configuration for the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public getObjectLocking(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<S3GetObjectLockConfigurationOutput> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.GetBucketVersioningRequest = { Bucket: bucket };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getObjectLockConfiguration(params).promise()
    ).pipe(
      catchError((err) => {
        if (err.code === 'ObjectLockConfigurationNotFoundError') {
          return of({
            /* eslint-disable @typescript-eslint/naming-convention */
            ObjectLockConfiguration: { ObjectLockEnabled: 'Disabled' }
            /* eslint-enable @typescript-eslint/naming-convention */
          });
        }
        return throwError(err);
      }),
      map((resp: AWS.S3.Types.GetObjectLockConfigurationOutput) => {
        /* eslint-disable @typescript-eslint/naming-convention */
        return {
          Bucket: bucket,
          ObjectLockEnabled: resp.ObjectLockConfiguration?.ObjectLockEnabled === 'Enabled',
          RetentionEnabled: _.isString(resp.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode),
          RetentionMode: resp.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode,
          RetentionValidity:
            resp.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days ||
            resp.ObjectLockConfiguration?.Rule?.DefaultRetention?.Years,
          RetentionUnit: _.isNumber(resp.ObjectLockConfiguration?.Rule?.DefaultRetention?.Years)
            ? 'Years'
            : 'Days'
          /* eslint-enable @typescript-eslint/naming-convention */
        };
      })
    );
  }

  /**
   * Places an Object Lock configuration on the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param objectLockConfiguration The Object Lock configuration.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObjectLockConfiguration-property
   */
  @CatchInvalidRequest()
  @CatchAuthErrors()
  public setObjectLocking(
    bucket: AWS.S3.Types.BucketName,
    objectLockConfiguration: S3BucketObjectLockConfiguration,
    credentials?: Credentials
  ): Observable<S3PutObjectLockConfigurationOutput> {
    const params: AWS.S3.Types.PutObjectLockConfigurationRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      ObjectLockConfiguration: {
        ObjectLockEnabled: 'Enabled',
        Rule: {
          DefaultRetention: {
            Mode: objectLockConfiguration.RetentionMode,
            Days:
              'Days' === objectLockConfiguration.RetentionUnit
                ? objectLockConfiguration.RetentionValidity
                : undefined,
            Years:
              'Years' === objectLockConfiguration.RetentionUnit
                ? objectLockConfiguration.RetentionValidity
                : undefined
          }
        }
      }
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).putObjectLockConfiguration(params).promise()
    ).pipe(
      map((resp: AWS.S3.Types.PutObjectLockConfigurationOutput) =>
        _.merge(resp, _.pick(params, ['Bucket']))
      )
    );
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
  @CatchAuthErrors()
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
  @CatchInvalidRequest()
  @CatchAuthErrors()
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
  @CatchAuthErrors()
  public getTagging(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<S3GetBucketTaggingOutput> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.GetBucketTaggingRequest = { Bucket: bucket };
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
  @CatchInvalidRequest()
  @CatchAuthErrors()
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
   * Returns the lifecycle configuration information set on the bucket.
   * Note, a `NoSuchLifecycleConfiguration` is caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getBucketLifecycleConfiguration-property
   */
  @CatchAuthErrors()
  public getLifecycleConfiguration(
    bucket: AWS.S3.Types.BucketName,
    credentials?: Credentials
  ): Observable<AWS.S3.Types.GetBucketLifecycleConfigurationOutput> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: AWS.S3.Types.GetBucketLifecycleConfigurationRequest = { Bucket: bucket };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getBucketLifecycleConfiguration(params).promise()
    ).pipe(
      catchError((err) => {
        if (['NoSuchLifecycleConfiguration'].includes(err.code)) {
          return of({
            /* eslint-disable @typescript-eslint/naming-convention */
            Rules: []
            /* eslint-enable @typescript-eslint/naming-convention */
          });
        }
        return throwError(err);
      })
    );
  }

  /**
   * Creates a new lifecycle configuration for the bucket or replaces an existing lifecycle configuration.
   *
   * @param bucket The name of the bucket.
   * @param rules The list of rules to set.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketLifecycleConfiguration-property
   */
  @CatchInvalidRequest()
  @CatchAuthErrors()
  public setLifecycleConfiguration(
    bucket: AWS.S3.Types.BucketName,
    rules: AWS.S3.Types.LifecycleRules,
    credentials?: Credentials
  ): Observable<void> {
    return defer(() => {
      // Note, we need to convert the hot promise to a cold observable.
      if (0 === rules.length) {
        return this.s3ClientService
          .get(credentials)
          .deleteBucketLifecycle({
            /* eslint-disable @typescript-eslint/naming-convention */
            Bucket: bucket
            /* eslint-enable @typescript-eslint/naming-convention */
          })
          .promise();
      }
      return this.s3ClientService
        .get(credentials)
        .putBucketLifecycleConfiguration({
          /* eslint-disable @typescript-eslint/naming-convention */
          Bucket: bucket,
          LifecycleConfiguration: { Rules: rules }
          /* eslint-enable @typescript-eslint/naming-convention */
        })
        .promise();
    }).pipe(map(() => void 0));
  }

  /**
   * Get the objects of the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param prefix Limits the response to objects with keys that begin
   *   with the specified prefix.
   * @param credentials The AWS credentials to sign requests with.
   *   Defaults to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
   */
  @CatchAuthErrors()
  public listObjects(
    bucket: AWS.S3.Types.BucketName,
    prefix?: AWS.S3.Types.Prefix,
    credentials?: Credentials
  ): Observable<S3Objects> {
    return new Observable<S3Objects>((observer: Subscriber<S3Objects>) => {
      const s3Client = this.s3ClientService.get(credentials);
      const params: AWS.S3.Types.ListObjectsV2Request = {
        /* eslint-disable @typescript-eslint/naming-convention */
        Bucket: bucket,
        Delimiter: this.delimiter,
        Prefix: prefix
        /* eslint-enable @typescript-eslint/naming-convention */
      };
      let aborted = false;
      (async () => {
        try {
          do {
            const resp: AWS.S3.Types.ListObjectsV2Output = await s3Client
              .listObjectsV2(params)
              .promise();
            params.ContinuationToken = resp.NextContinuationToken;
            const value = _.map(resp.Contents ?? [], (object: AWS.S3.Types.Object) => {
              return _.merge(object, {
                /* eslint-disable @typescript-eslint/naming-convention */
                Name: this.splitKey(object.Key!).pop(),
                Type: 'OBJECT'
                /* eslint-enable @typescript-eslint/naming-convention */
              });
            });
            if (resp.CommonPrefixes?.length) {
              _.forEach(resp.CommonPrefixes, (cp: AWS.S3.Types.CommonPrefix) => {
                value.push({
                  /* eslint-disable @typescript-eslint/naming-convention */
                  Key: this.buildKey(cp.Prefix!),
                  Name: this.splitKey(cp.Prefix!).pop(),
                  Type: 'FOLDER'
                  /* eslint-enable @typescript-eslint/naming-convention */
                });
              });
            }
            observer.next(value as S3Objects);
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
  @CatchInvalidRequest()
  @CatchAuthErrors()
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
   * Delete the objects specified by a prefix.
   *
   * @param bucket The name of the bucket.
   * @param prefix The prefix of the objects to delete.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public deleteObjects(
    bucket: AWS.S3.Types.BucketName,
    prefix: AWS.S3.Prefix,
    credentials?: Credentials
  ): Observable<S3DeleteObjectOutput> {
    prefix = _.trim(prefix, this.delimiter);
    return this.listObjects(bucket, `${prefix}${this.delimiter}`, credentials).pipe(
      switchMap((objects: S3Objects) =>
        from(objects).pipe(
          switchMap((object: S3Object) => {
            return 'OBJECT' === object.Type
              ? this.deleteObject(bucket, object.Key!, credentials)
              : this.deleteObjects(bucket, object.Key!, credentials);
          })
        )
      ),
      map(() => {
        return {
          /* eslint-disable @typescript-eslint/naming-convention */
          Bucket: bucket,
          Key: prefix
          /* eslint-enable @typescript-eslint/naming-convention */
        };
      })
    );
  }

  /**
   * Upload the given file.
   *
   * @param bucket The name of the bucket.
   * @param file The file to upload.
   * @param prefix Optional prefix that is added to the object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
   */
  @CatchAuthErrors()
  public uploadObject(
    bucket: AWS.S3.Types.BucketName,
    file: File,
    prefix?: AWS.S3.Types.Prefix,
    credentials?: Credentials
  ): Observable<AWS.S3.Types.ManagedUpload.SendData> {
    const params: AWS.S3.Types.PutObjectRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: this.buildKey(file.name, prefix),
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
   * @param prefix Optional prefix that is added to the object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public uploadObjects(
    bucket: AWS.S3.Types.BucketName,
    fileList: FileList,
    prefix?: AWS.S3.Types.Prefix,
    credentials?: Credentials
  ): Observable<S3UploadProgress> {
    const sources: Observable<AWS.S3.Types.ManagedUpload.SendData>[] = [];
    _.forEach(fileList, (file: File) =>
      sources.push(this.uploadObject(bucket, file, prefix, credentials))
    );
    return merge(...sources).pipe(
      map((sendData: AWS.S3.Types.ManagedUpload.SendData, index: number) => {
        return { loaded: index + 1, total: fileList.length, sendData };
      })
    );
  }

  /**
   * Check if the specified object exists.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public existsObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<boolean> {
    return this.headObject(bucket, key, undefined, credentials).pipe(
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
  @CatchAuthErrors()
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
   * Adds an object to a bucket.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param optionalParams Optional parameters.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
   */
  @CatchInvalidRequest()
  @CatchAuthErrors()
  public putObject(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    optionalParams?: Partial<AWS.S3.Types.PutObjectRequest>,
    credentials?: Credentials
  ): Observable<S3PutObjectOutput> {
    const params: AWS.S3.Types.PutObjectRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key,
      /* eslint-enable @typescript-eslint/naming-convention */
      ...optionalParams
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).putObject(params).promise()
    ).pipe(
      map((resp: AWS.S3.Types.PutObjectOutput) => _.merge(resp, _.pick(params, ['Bucket', 'Key'])))
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
  @CatchAuthErrors()
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
  @CatchAuthErrors()
  public getObjectAttributes(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectAttributesOutput> {
    return forkJoin({
      object: this.headObject(bucket, key, undefined, credentials),
      tagging: this.getObjectTagging(bucket, key, credentials),
      legalHold: this.getObjectLegalHold(bucket, key, credentials)
    }).pipe(
      map((resp) => {
        return {
          ...resp.object,
          ...resp.tagging,
          /* eslint-disable @typescript-eslint/naming-convention */
          ObjectLockLegalHoldStatus: resp.legalHold.LegalHold?.Status
          /* eslint-enable @typescript-eslint/naming-convention */
        };
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
   * Note, a `NoSuchTagSetError` or `NoSuchTagSet` is caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObjectTagging-property
   */
  @CatchAuthErrors()
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
  @CatchInvalidRequest()
  @CatchAuthErrors()
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

  /**
   * Retrieves an object's retention settings.
   * Note, a `InvalidRequest` or `ObjectLockConfigurationNotFoundError` is
   * caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObjectRetention-property
   */
  @CatchAuthErrors()
  public getObjectRetention(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectRetentionOutput> {
    const params: AWS.S3.Types.GetObjectRetentionRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getObjectRetention(params).promise()
    ).pipe(
      catchError((err) => {
        if (['InvalidRequest', 'ObjectLockConfigurationNotFoundError'].includes(err.code)) {
          return of({});
        }
        return throwError(err);
      }),
      map((resp: AWS.S3.Types.GetObjectRetentionOutput) => {
        return _.merge(resp, params);
      })
    );
  }

  /**
   * Gets an object's current legal hold status.
   * Note, a `InvalidRequest` or `ObjectLockConfigurationNotFoundError` is
   * caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObjectLegalHold-property
   */
  @CatchAuthErrors()
  public getObjectLegalHold(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    credentials?: Credentials
  ): Observable<S3GetObjectLegalHoldOutput> {
    const params: AWS.S3.Types.GetObjectLegalHoldRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).getObjectLegalHold(params).promise()
    ).pipe(
      catchError((err) => {
        if (['InvalidRequest', 'ObjectLockConfigurationNotFoundError'].includes(err.code)) {
          return of({});
        }
        return throwError(err);
      }),
      map((resp: AWS.S3.Types.GetObjectLegalHoldOutput) => {
        return _.merge(resp, params);
      })
    );
  }

  /**
   * Applies a legal hold configuration to the specified object.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param status The legal hold status, e.g. `ON` or `OFF`.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObjectLegalHold-property
   */
  @CatchInvalidRequest()
  @CatchAuthErrors()
  public setObjectLegalHold(
    bucket: AWS.S3.Types.BucketName,
    key: AWS.S3.ObjectKey,
    status: AWS.S3.Types.ObjectLockLegalHoldStatus,
    credentials?: Credentials
  ): Observable<S3PutObjectLegalHoldOutput> {
    const params: AWS.S3.Types.PutObjectLegalHoldRequest = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Bucket: bucket,
      Key: key,
      LegalHold: { Status: status }
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return defer(() =>
      // Note, we need to convert the hot promise to a cold observable.
      this.s3ClientService.get(credentials).putObjectLegalHold(params).promise()
    ).pipe(map((resp: AWS.S3.Types.PutObjectLegalHoldOutput) => _.merge(resp, params)));
  }
}
