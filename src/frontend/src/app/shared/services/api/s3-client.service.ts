import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

@Injectable({
  providedIn: 'root'
})
export class S3ClientService {
  private clients: Map<string, AWS.S3> = new Map();

  constructor(
    private authSessionService: AuthSessionService,
    private rgwServiceConfigService: RgwServiceConfigService
  ) {}

  /**
   * Get the S3 service object for the specified credentials.
   *
   * @param credentials The AWS credentials to sign requests with. Defaults
   *   to the credentials of the currently logged-in user.
   * @private
   */
  public get(credentials?: Credentials): AWS.S3 {
    credentials = credentials ?? this.authSessionService.getCredentials();
    const key = Credentials.md5(credentials);
    let client: AWS.S3 | undefined = this.clients.get(key);
    if (_.isUndefined(client)) {
      client = this.create(credentials);
      this.clients.set(key, client);
    }
    return client;
  }

  /**
   * Helper function to create the S3 service object.
   *
   * @param credentials The AWS credentials to sign requests with.
   * @private
   */
  private create(credentials: Credentials): AWS.S3 {
    return new AWS.S3({
      credentials: {
        accessKeyId: credentials.accessKey!,
        secretAccessKey: credentials.secretKey!
      },
      endpoint: this.rgwServiceConfigService.config.url,
      s3BucketEndpoint: false,
      s3ForcePathStyle: true,
      signatureVersion: 'v2'
    });
  }
}
