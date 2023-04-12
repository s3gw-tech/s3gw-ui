import { DatatableData } from '~/app/shared/models/datatable-data.type';

export interface Datatable {
  selected: DatatableData[];

  /**
   * Reload the data.
   */
  reloadData(): void;

  /**
   * Clear the selection.
   */
  clearSelection(): void;

  /**
   * Update the selection.
   */
  updateSelection(): void;
}
