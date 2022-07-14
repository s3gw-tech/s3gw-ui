import * as CryptoJS from 'crypto-js';

/**
 * Code is based on https://github.com/egorFiNE/node-aws-sign
 * Author: Egor Egorov, me@egorfine.com
 * License: MIT
 *
 * Adapted for Ceph RGW Admin Ops API.
 * Author: Volker Theile, vtheile@suse.com
 *
 * @see https://docs.aws.amazon.com/general/latest/gr/signature-version-2.html
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/RESTAuthentication.html
 * @see https://github.com/ceph/ceph/blob/main/src/rgw/rgw_auth_s3.cc
 * @see https://github.com/tax/python-requests-aws/blob/master/awsauth.py
 */
class AWSRestSigner {
  static subResources: string[] = [
    'acl',
    'cors',
    'delete',
    'encryption',
    'lifecycle',
    'location',
    'logging',
    'notification',
    'partNumber',
    'policy',
    'policyStatus',
    'publicAccessBlock',
    'requestPayment',
    'response-cache-control',
    'response-content-disposition',
    'response-content-encoding',
    'response-content-language',
    'response-content-type',
    'response-expires',
    'tagging',
    'torrent',
    'uploadId',
    'uploads',
    'versionId',
    'versioning',
    'versions',
    'website',
    'object-lock'
  ];

  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(accessKeyId: string, secretAccessKey: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
  }

  static canonizeAwzHeaders(xAmzHeaders: Record<string, string>) {
    if (xAmzHeaders) {
      const lcHeaders: Record<string, string> = {};
      for (const [header, value] of Object.entries(xAmzHeaders)) {
        const lcHeader = header.toLowerCase();
        lcHeaders[lcHeader] = value;
      }

      return Object.keys(lcHeaders)
        .sort()
        .map((header) => header + ':' + lcHeaders[header] + '\n')
        .join('');
    }

    return '';
  }

  static extractSubResources(queryString: string) {
    const params = new URLSearchParams(queryString);

    const subResources: Array<string> = [];
    for (const param of params.values()) {
      if (AWSRestSigner.subResources.indexOf(param) >= 0) {
        subResources.push(param);
      }
    }

    if (subResources.length <= 0) {
      return '';
    }

    subResources.sort();

    const queryToSign = subResources.map((param) => {
      if (params.get(param) !== '') {
        return param + '=' + params.get(param);
      }
      return param;
    });

    return '?' + queryToSign.join('&');
  }

  sign(opts: Record<string, any>): void {
    const method = opts['method'];
    const url = opts['url'];
    const xAmzHeaders: Record<string, any> = {};

    let date = null;
    let contentType = null;
    let contentMd5 = null;

    if (!opts['headers']) {
      opts['headers'] = {};
    }

    for (const [key, value] of Object.entries(opts['headers'])) {
      const lcKey = key.toLowerCase();

      switch (lcKey) {
        case 'date':
          date = value;
          break;

        case 'content-type':
          contentType = value;
          break;

        case 'content-md5':
          contentMd5 = value;
          break;

        default:
          if (lcKey.startsWith('x-amz-')) {
            xAmzHeaders[lcKey] = value;
          }
          break;
      }
    }

    if (!date && !('x-amz-date' in xAmzHeaders)) {
      date = new Date().toUTCString();
      opts['headers'].date = date;
    }

    // eslint-disable-next-line no-underscore-dangle
    opts['headers'].Authorization = this._sign(
      method,
      url,
      date,
      contentType,
      contentMd5,
      xAmzHeaders
    );
  }

  _sign(
    method: string,
    url: string,
    date: unknown,
    contentType: unknown,
    contentMd5: unknown,
    xAmzHeaders: Record<string, any>
  ): string {
    let queryToSign = '';
    // eslint-disable-next-line no-underscore-dangle
    let _url = url;

    const qPos = url.indexOf('?');
    if (qPos >= 0) {
      const queryPart = url.substr(qPos + 1);
      _url = url.substr(0, qPos);
      queryToSign = AWSRestSigner.extractSubResources(queryPart);
    }

    const canonicalizedAmzHeaders = AWSRestSigner.canonizeAwzHeaders(xAmzHeaders);
    const canonicalizedResource = '/' + _url + queryToSign;

    const stringToSign =
      (method || '') +
      '\n' +
      (contentMd5 || '') +
      '\n' +
      (contentType || '') +
      '\n' +
      (date || '') +
      '\n' +
      canonicalizedAmzHeaders +
      canonicalizedResource;

    return (
      'AWS ' +
      this.accessKeyId +
      ':' +
      CryptoJS.HmacSHA1(stringToSign, this.secretAccessKey).toString(CryptoJS.enc.Base64)
    );
  }
}

export const sign = (
  opts: Record<string, any>,
  accessKeyId: string,
  secretAccessKey: string
): void => {
  new AWSRestSigner(accessKeyId, secretAccessKey).sign(opts);
};
