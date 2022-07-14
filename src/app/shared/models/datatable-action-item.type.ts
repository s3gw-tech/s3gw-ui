import { DatatableData } from '~/app/shared/models/datatable-data.type';

export type DatatableActionItem = {
  type?: 'menu' | 'divider';
  title?: string;
  icon?: string;
  disabled?: boolean;
  callback?: (data: DatatableData) => void;
};
