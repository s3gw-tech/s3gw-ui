import { DatatableData } from '~/app/shared/models/datatable-data.type';

export type DatatableRowAction = {
  type?: 'menu' | 'divider';
  title?: string;
  icon?: string;
  disabled?: boolean;
  callback?: (data: DatatableData) => void;
};
