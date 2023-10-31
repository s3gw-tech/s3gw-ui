/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';
import { EMPTY, merge, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { S3gwApiService } from '~/app/shared/services/api/s3gw-api.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { S3gwConfigService } from '~/app/shared/services/s3gw-config.service';

// eslint-disable-next-line @typescript-eslint/naming-convention,prefer-arrow/prefer-arrow-functions
function CatchErrorsByStatus(errors: number[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalFn = descriptor.value;
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    descriptor.value = function (...args: any[]) {
      // @ts-ignore
      const result: Observable<any> = originalFn.apply(this, args);
      return result.pipe(
        catchError((err) => {
          if (errors.includes(err.status)) {
            const message = _.get(err, 'error.detail', err.message);
            // @ts-ignore
            this.notificationService.showError(_.capitalize(_.trimEnd(message), '.') + '.');
            err.preventDefault?.();
            return EMPTY;
          } else {
            return throwError(err);
          }
        })
      );
    };
    return descriptor;
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention,prefer-arrow/prefer-arrow-functions
function CatchErrors(errors: string[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalFn = descriptor.value;
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    descriptor.value = function (...args: any[]) {
      // @ts-ignore
      const result: Observable<any> = originalFn.apply(this, args);
      return result.pipe(
        catchError((err) => {
          if (errors.includes(err.code)) {
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
function CatchInvalidRequest() {
  return CatchErrors(['InvalidRequest']);
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

//////////////////////////////////////////////////////////////////////////////
// Types returned by the REST API.
//////////////////////////////////////////////////////////////////////////////
type BucketResponse = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Name: string;
  CreationDate?: string; // <--- differs from `S3Bucket`
  /* eslint-enable @typescript-eslint/naming-convention */
};

type BucketListResponse = BucketResponse[];

type BucketAttributesResponse = BucketResponse &
  S3BucketObjectLockConfiguration &
  S3Tagging & {
    /* eslint-disable @typescript-eslint/naming-convention */
    VersioningEnabled?: boolean;
    /* eslint-enable @typescript-eslint/naming-convention */
  };

//////////////////////////////////////////////////////////////////////////////
// Types used by the service methods.
//////////////////////////////////////////////////////////////////////////////

export type S3BucketName = string;
export type S3Prefix = string;
export type S3ObjectKey = string;
export type S3ObjectVersionId = string;
export type S3ETag = string;
export type S3ID = string;
export type S3ObjectLockLegalHoldStatus = 'ON' | 'OFF';

export type S3Bucket = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Name?: S3BucketName;
  CreationDate?: Date;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Buckets = S3Bucket[];

export type S3BucketObjectLockConfiguration = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ObjectLockEnabled?: boolean;
  RetentionEnabled?: boolean;
  RetentionMode?: 'GOVERNANCE' | 'COMPLIANCE';
  RetentionValidity?: number;
  RetentionUnit?: 'Days' | 'Years';
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Owner = {
  /* eslint-disable @typescript-eslint/naming-convention */
  DisplayName?: string;
  ID?: S3ID;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3Tag = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Key: string;
  Value: string;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3TagSet = S3Tag[];

export type S3Tagging = {
  /* eslint-disable @typescript-eslint/naming-convention */
  TagSet?: S3TagSet;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3BucketAttributes = S3Bucket &
  S3BucketObjectLockConfiguration &
  S3Tagging & {
    /* eslint-disable @typescript-eslint/naming-convention */
    VersioningEnabled?: boolean;
    /* eslint-enable @typescript-eslint/naming-convention */
  };

export type S3Object = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Key?: S3ObjectKey;
  VersionId?: string;
  LastModified?: string;
  ETag?: S3ETag;
  ObjectLockMode?: 'COMPLIANCE' | 'GOVERNANCE';
  ObjectLockRetainUntilDate?: string;
  ObjectLockLegalHoldStatus?: S3ObjectLockLegalHoldStatus;
  Owner?: S3Owner;
  ContentType?: string;
  Name: string;
  Size?: number;
  Type: 'OBJECT' | 'FOLDER';
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3ObjectAttributes = S3Object & S3BucketObjectLockConfiguration & S3Tagging;

export type S3Objects = S3Object[];

export type S3ObjectVersion = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ETag?: S3ETag;
  Size?: number;
  Key?: S3ObjectKey;
  VersionId?: string;
  IsLatest?: boolean;
  LastModified?: string;
  Owner?: S3Owner;
  Name: string;
  Type: 'OBJECT' | 'FOLDER';
  IsDeleted: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3ObjectVersionList = S3ObjectVersion[];

export type S3UploadProgress = {
  loaded: number;
  total: number;
};

export type S3LifecycleRuleFilter = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Prefix?: string;
  Tag?: S3Tag;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3LifecycleExpiration = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Date?: Date;
  Days?: number;
  ExpiredObjectDeleteMarker?: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3LifecycleRule = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Expiration?: S3LifecycleExpiration;
  ID?: S3ID;
  Prefix?: string;
  Filter?: S3LifecycleRuleFilter;
  Status: 'Enabled' | 'Disabled';
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3LifecycleRules = S3LifecycleRule[];

export type S3GetBucketLifecycleConfiguration = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Rules?: S3LifecycleRules;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type S3DeletedObject = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Key: S3ObjectKey;
  VersionId?: S3ObjectVersionId;
  DeleteMarker?: boolean;
  DeleteMarkerVersionId?: string;
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
    private s3gwConfigService: S3gwConfigService,
    private s3gwApiService: S3gwApiService
  ) {}

  get delimiter(): string {
    return this.s3gwConfigService.config.delimiter;
  }

  /**
   * Helper method to build a prefix from parts using the
   * configured delimiter.
   *
   * @param parts The prefix parts.
   * @param trailingDelimiter If `true`, a delimiter will be appended.
   *  Defaults to `false`.
   */
  public buildPrefix(parts: string[], trailingDelimiter = false): S3Prefix {
    const result: string = parts.length ? _.join(parts, this.delimiter) : '';
    return result.length && trailingDelimiter ? `${result}${this.delimiter}` : result;
  }

  /**
   * Helper method to build a valid object key using the configured
   * delimiter.
   *
   * Example:
   * key='foo/xyz', prefix='/bar/baz' => 'bar/baz/foo/xyz'
   *
   * @param key The object key.
   * @param prefix The optional prefix.
   */
  public buildKey(key: S3ObjectKey, prefix?: S3Prefix | string[]): S3ObjectKey {
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
  public splitKey(key: S3ObjectKey): string[] {
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
   */
  @CatchAuthErrors()
  public list(credentials?: Credentials): Observable<S3Buckets> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.get<BucketListResponse>('buckets/', { credentials }).pipe(
      map((resp: BucketListResponse): S3Buckets => {
        return _.map(resp, (bucket: BucketResponse): S3Bucket => {
          /* eslint-disable @typescript-eslint/naming-convention */
          return { ...bucket, CreationDate: new Date(bucket.CreationDate!) };
          /* eslint-enable @typescript-eslint/naming-convention */
        });
      })
    );
  }

  /**
   * Get the number of buckets.
   *
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public count(credentials?: Credentials): Observable<number> {
    return this.list(credentials).pipe(map((resp: S3Buckets) => resp.length));
  }

  /**
   * Get the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public get(bucket: S3BucketName, credentials?: Credentials): Observable<S3Bucket> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.get<BucketResponse>(`buckets/${bucket}`, { credentials }).pipe(
      map((resp: BucketResponse): S3Bucket => {
        /* eslint-disable @typescript-eslint/naming-convention */
        return { ...resp, CreationDate: new Date(resp.CreationDate!) };
        /* eslint-enable @typescript-eslint/naming-convention */
      })
    );
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
    bucket: S3BucketName,
    credentials?: Credentials
  ): Observable<S3BucketAttributes> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService
      .get<BucketAttributesResponse>(`buckets/${bucket}/attributes`, { credentials })
      .pipe(
        map((resp: BucketAttributesResponse): S3BucketAttributes => {
          /* eslint-disable @typescript-eslint/naming-convention */
          return { ...resp, CreationDate: new Date(resp.CreationDate!) };
          /* eslint-enable @typescript-eslint/naming-convention */
        })
      );
  }

  /**
   * Check if the specified bucket exists.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public exists(bucket: S3BucketName, credentials?: Credentials): Observable<boolean> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.head(`buckets/${bucket}`, { credentials }).pipe(
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
   * @param bucketAttrs The bucket to create.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public create(bucketAttrs: S3BucketAttributes, credentials?: Credentials): Observable<S3Bucket> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const params = {
      /* eslint-disable @typescript-eslint/naming-convention */
      bucket: bucketAttrs.Name!,
      enable_object_locking: _.defaultTo(bucketAttrs.ObjectLockEnabled, false)
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.put(`buckets/`, { credentials, params }).pipe(
      switchMap(() => {
        return this.update(bucketAttrs, credentials);
      })
    );
  }

  /**
   * Update the specified bucket.
   *
   * @param bucketAttrs The bucket to update.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  public update(
    bucketAttrs: Partial<S3BucketAttributes>,
    credentials?: Credentials
  ): Observable<S3BucketAttributes> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService
      .put<BucketAttributesResponse>(`buckets/${bucketAttrs.Name}`, {
        body: bucketAttrs,
        credentials
      })
      .pipe(
        map((resp: BucketAttributesResponse): S3BucketAttributes => {
          /* eslint-disable @typescript-eslint/naming-convention */
          return { ...resp, CreationDate: new Date(resp.CreationDate!) };
          /* eslint-enable @typescript-eslint/naming-convention */
        })
      );
  }

  /**
   * Delete the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public delete(bucket: S3BucketName, credentials?: Credentials): Observable<string> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.delete(`buckets/${bucket}`, { credentials }).pipe(map(() => bucket));
  }

  /**
   * Get the versioning state of the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public getVersioning(bucket: S3BucketName, credentials?: Credentials): Observable<boolean> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.get<boolean>(`buckets/${bucket}/versioning`, { credentials });
  }

  /**
   * Returns the lifecycle configuration information set on the bucket.
   * Note, a `NoSuchLifecycleConfiguration` is caught and handled properly.
   *
   * @param bucket The name of the bucket.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public getLifecycleConfiguration(
    bucket: S3BucketName,
    credentials?: Credentials
  ): Observable<S3GetBucketLifecycleConfiguration> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.get<S3GetBucketLifecycleConfiguration>(
      `buckets/${bucket}/lifecycle-configuration`,
      {
        credentials
      }
    );
  }

  /**
   * Creates a new lifecycle configuration for the bucket or replaces an existing lifecycle configuration.
   *
   * @param bucket The name of the bucket.
   * @param rules The list of rules to set.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchInvalidRequest()
  @CatchAuthErrors()
  public setLifecycleConfiguration(
    bucket: S3BucketName,
    rules: S3LifecycleRules,
    credentials?: Credentials
  ): Observable<boolean> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    return this.s3gwApiService.put<boolean>(`buckets/${bucket}/lifecycle-configuration`, {
      body: {
        /* eslint-disable @typescript-eslint/naming-convention */
        Rules: rules
        /* eslint-enable @typescript-eslint/naming-convention */
      },
      credentials
    });
  }

  /**
   * Get the objects of the specified bucket.
   *
   * @param bucket The name of the bucket.
   * @param prefix Limits the response to objects with keys that begin
   *   with the specified prefix.
   * @param credentials The AWS credentials to sign requests with.
   *   Defaults to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public listObjects(
    bucket: S3BucketName,
    prefix?: S3Prefix,
    credentials?: Credentials
  ): Observable<S3Objects> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Delimiter: this.delimiter
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    if (_.isString(prefix)) {
      body['Prefix'] = prefix;
    }
    return this.s3gwApiService.post<S3Objects>(`objects/${bucket}`, {
      body,
      credentials
    });
  }

  /**
   * Returns enhanced metadata about all versions of the objects in a
   * bucket.
   *
   * @param bucket The name of the bucket.
   * @param prefix Limits the response to objects with keys that begin
   *   with the specified prefix.
   * @param credentials The AWS credentials to sign requests with.
   *   Defaults to the credentials of the currently logged-in user.
   *
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectVersions-property
   */
  @CatchAuthErrors()
  public listObjectVersions(
    bucket: S3BucketName,
    prefix?: S3Prefix,
    credentials?: Credentials
  ): Observable<S3ObjectVersionList> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Delimiter: this.delimiter
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    if (_.isString(prefix)) {
      body['Prefix'] = prefix;
    }
    return this.s3gwApiService.post<S3ObjectVersionList>(`objects/${bucket}/versions`, {
      body,
      credentials
    });
  }

  /**
   * Delete the specified object.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param versionId The version ID used to reference a specific version
   *   of the object.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchErrorsByStatus([403])
  public deleteObject(
    bucket: S3BucketName,
    key: S3ObjectKey,
    versionId?: S3ObjectVersionId,
    credentials?: Credentials
  ): Observable<S3DeletedObject> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key,
      VersionId: versionId
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.delete<S3DeletedObject>(`objects/${bucket}/delete`, {
      body,
      credentials
    });
  }

  /**
   * Delete the object(s) specified by a prefix.
   *
   * @param bucket The name of the bucket.
   * @param prefix The prefix of the objects to delete. Note, a prefix
   *   like `a/b/` will delete all objects starting with that prefix,
   *   whereas `a/b` will only delete this specific object.
   * @param allVersions If `true`, all versions will be deleted, otherwise
   *   only the latest one. Defaults to `false`.
   * @param credentials The AWS credentials to sign requests with.
   *   Defaults to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public deleteObjectByPrefix(
    bucket: S3BucketName,
    prefix: S3Prefix,
    allVersions?: boolean,
    credentials?: Credentials
  ): Observable<S3DeletedObject[]> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Prefix: prefix,
      Delimiter: this.delimiter,
      AllVersions: allVersions
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.delete<S3DeletedObject[]>(`objects/${bucket}/delete-by-prefix`, {
      body,
      credentials
    });
  }

  /**
   * Upload the given file.
   *
   * @param bucket The name of the bucket.
   * @param file The file to upload.
   * @param prefix Optional prefix that is added to the object key.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public uploadObject(
    bucket: S3BucketName,
    file: File,
    prefix?: S3Prefix,
    credentials?: Credentials
  ): Observable<void> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', this.buildKey(file.name, prefix));
    return this.s3gwApiService.post<void>(`objects/${bucket}/upload`, {
      body: formData,
      credentials
    });
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
    bucket: S3BucketName,
    fileList: FileList,
    prefix?: S3Prefix,
    credentials?: Credentials
  ): Observable<S3UploadProgress> {
    const sources: Observable<void>[] = [];
    _.forEach(fileList, (file: File) =>
      sources.push(this.uploadObject(bucket, file, prefix, credentials))
    );
    return merge(...sources).pipe(
      map((data: void, index: number): S3UploadProgress => {
        return { loaded: index + 1, total: fileList.length };
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
    bucket: S3BucketName,
    key: S3ObjectKey,
    credentials?: Credentials
  ): Observable<boolean> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.post(`objects/${bucket}/exists`, { body, credentials }).pipe(
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
   * Retrieves all the metadata from an object without returning the
   * object itself.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param versionId The version ID used to reference a specific version
   *   of the object.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchAuthErrors()
  public getObjectAttributes(
    bucket: S3BucketName,
    key: S3ObjectKey,
    versionId?: S3ObjectVersionId,
    credentials?: Credentials
  ): Observable<S3ObjectAttributes> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key,
      VersionId: versionId
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.post<S3ObjectAttributes>(`objects/${bucket}/attributes`, {
      body,
      credentials
    });
  }

  /**
   * Download the specified object and save it as file.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param versionId The version ID used to reference a specific version
   *   of the object.
   * @param credentials The AWS credentials to sign requests with.
   *   Defaults to the credentials of the currently logged-in user.
   */
  public downloadObject(
    bucket: S3BucketName,
    key: S3ObjectKey,
    versionId?: S3ObjectVersionId,
    credentials?: Credentials
  ): Observable<Blob> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key,
      VersionId: versionId
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService
      .download(`objects/${bucket}/download`, {
        body,
        credentials
      })
      .pipe(
        tap((data: Blob): void => {
          // @ts-ignore
          const filename: string = _.split(key, '/').slice(-1)[0];
          saveAs(data, filename);
        })
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
   */
  @CatchInvalidRequest()
  @CatchAuthErrors()
  public setObjectTagging(
    bucket: S3BucketName,
    key: S3ObjectKey,
    tags: S3TagSet,
    credentials?: Credentials
  ): Observable<boolean> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key,
      TagSet: tags
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.put<boolean>(`objects/${bucket}/tags`, {
      body,
      credentials
    });
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
    bucket: S3BucketName,
    key: S3ObjectKey,
    status: S3ObjectLockLegalHoldStatus,
    credentials?: Credentials
  ): Observable<boolean> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key,
      LegalHold: { Status: status }
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.put<boolean>(`objects/${bucket}/legal-hold`, {
      body,
      credentials
    });
  }

  /**
   * Restores an object by creating a copy of the specified object.
   *
   * @param bucket The name of the bucket.
   * @param key The object key.
   * @param versionId The version ID used to reference a specific version
   *   of the object.
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   */
  @CatchErrors(['NoSuchKey', 'InvalidRequest'])
  @CatchAuthErrors()
  public restoreObject(
    bucket: S3BucketName,
    key: S3ObjectKey,
    versionId?: S3ObjectVersionId,
    credentials?: Credentials
  ): Observable<void> {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const body: Record<string, any> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      Key: key,
      VersionId: versionId
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    return this.s3gwApiService.put<void>(`objects/${bucket}/restore`, {
      body,
      credentials
    });
  }
}
