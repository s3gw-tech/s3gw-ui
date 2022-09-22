import { Key } from '~/app/shared/services/api/user.service';

export type Credentials = {
  accessKey: string | null;
  secretKey: string | null;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Credentials = {
  fromKey: (key: Key): Credentials => ({ accessKey: key.access_key!, secretKey: key.secret_key! })
};
