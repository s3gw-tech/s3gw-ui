import * as CryptoJS from 'crypto-js';

import { Key } from '~/app/shared/services/api/admin-ops-user.service';

export type Credentials = {
  accessKey: string | null;
  secretKey: string | null;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Credentials = {
  fromKey: (key: Key): Credentials => ({ accessKey: key.access_key!, secretKey: key.secret_key! }),

  fromStrings: (accessKey: string, secretKey: string): Credentials => ({
    accessKey,
    secretKey
  }),

  /**
   * Get the MD5 sum of the specified credentials.
   */
  md5: (credentials: Credentials): string => CryptoJS.MD5(JSON.stringify(credentials)).toString()
};
