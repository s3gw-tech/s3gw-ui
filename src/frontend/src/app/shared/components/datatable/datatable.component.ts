/* eslint-disable no-underscore-dangle */
import { animate, style, transition, trigger } from '@angular/animations';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  NgZone,
  OnInit,
  Output,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Subscription, timer } from 'rxjs';

import { Throttle, Unsubscribe } from '~/app/functions.helper';
import { format } from '~/app/functions.helper';
import { translate } from '~/app/i18n.helper';
import { DatatableExpandedRowTemplateDirective } from '~/app/shared/directives/datatable-expanded-row-template.directive';
import { Icon } from '~/app/shared/enum/icon.enum';
import { Datatable } from '~/app/shared/models/datatable.interface';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { NotificationService } from '~/app/shared/services/notification.service';
import { UserLocalStorageService } from '~/app/shared/services/user-local-storage.service';

export enum SortDirection {
  ascending = 'asc',
  descending = 'desc'
}

@Component({
  selector: 's3gw-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  animations: [
    trigger('fadeSlideInOutExpandedRow', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('250ms', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [animate('250ms', style({ opacity: 0, transform: 'translateY(10px)' }))])
    ])
  ]
})
export class DatatableComponent implements Datatable, OnInit {
  @ViewChild('iconTpl', { static: true })
  iconTpl?: TemplateRef<any>;
  @ViewChild('checkIconTpl', { static: true })
  checkIconTpl?: TemplateRef<any>;
  @ViewChild('yesNoIconTpl', { static: true })
  yesNoIconTpl?: TemplateRef<any>;
  @ViewChild('rowExpandableTpl', { static: true })
  rowExpandableTpl?: TemplateRef<any>;
  @ViewChild('rowSelectTpl', { static: true })
  rowSelectTpl?: TemplateRef<any>;
  @ViewChild('actionMenuTpl', { static: true })
  actionMenuTpl?: TemplateRef<any>;
  @ViewChild('mapTpl', { static: true })
  mapTpl?: TemplateRef<any>;
  @ViewChild('badgeTpl', { static: true })
  badgeTpl?: TemplateRef<any>;
  @ViewChild('localeDateTimeTpl', { static: true })
  localeDateTimeTpl?: TemplateRef<any>;
  @ViewChild('buttonTpl', { static: true })
  buttonTpl?: TemplateRef<any>;
  @ViewChild('binaryUnitTpl', { static: true })
  binaryUnitTpl?: TemplateRef<any>;
  @ViewChild('copyToClipboardTpl', { static: true })
  copyToClipboardTpl?: TemplateRef<any>;
  @ViewChild('maskedTpl', { static: true })
  maskedTpl?: TemplateRef<any>;

  @ContentChild(DatatableExpandedRowTemplateDirective, { read: TemplateRef, static: true })
  expandedRowTpl?: TemplateRef<any>;

  @Input()
  columns: DatatableColumn[] = [];

  // The default page size.
  @Input()
  pageSize = 25;

  // The name of the column used for sorting.
  // Defaults to the first item in `columns`.
  @Input()
  sortHeader?: string;

  @Input()
  sortDirection: 'asc' | 'desc' = SortDirection.ascending;

  @Input()
  hasPageSize = true;

  @Input()
  hasSearchField = true;

  // The auto-reload time in milliseconds. The load event will be fired
  // immediately. Set to `0` or `false` to disable this feature. Set the
  // value to a negative number to prevent triggering the `loadData`
  // event when the component is initialized.
  // Defaults to `15000`.
  @Input()
  autoReload: number | boolean = 15000;

  // Row property used as unique identifier for the shown data. Only used if
  // the row selection is enabled. Will throw an error if property not found
  // in given columns. Defaults to `id`.
  @Input()
  identifier = 'id';

  // Defines the following row selection types:
  // none: no row selection
  // single: allows single-select
  // multi: allows multi-select
  // Defaults to `none` (no row selection).
  @Input()
  selectionType: 'single' | 'multi' | 'none' = 'none';

  @Input()
  stateId?: string;

  @Input()
  selected: DatatableData[] = [];

  // Expanded rows can be used to display additional information.
  // An additional column with an icon button to expand or collapse the row
  // will be added automatically. Defaults to `false`.
  @Input()
  hasExpandableRows = false;

  @Input()
  isExpandableRow?: (data: DatatableData) => boolean;

  // Stick the table column header to the top of the nearest scrolling
  // ancestor and containing block. Defaults to `true`.
  @Input()
  hasStickyHeader = true;

  @Output()
  loadData = new EventEmitter();

  // This event is fired when a single row is clicked. The data of the line
  // and the configuration of the column that was clicked are submitted.
  @Output()
  rowSelection = new EventEmitter<[DatatableData, DatatableColumn]>();

  // This event is fired whenever the selection of the rows has changed.
  // The data of all selected rows is submitted.
  @Output()
  selectionChange = new EventEmitter<DatatableData[]>();

  // This event is fired whenever the number of expanded rows has changed.
  // The data of all expanded rows is submitted.
  @Output()
  expandedRowsChange = new EventEmitter<DatatableData[]>();

  @Unsubscribe()
  private subscriptions: Subscription = new Subscription();

  ////////////////////////////////////////////////////////////////////////////
  // Internal
  public icons = Icon;
  public page = 1;
  public cellTemplates: Record<string, TemplateRef<any>> = {};
  public isAllRowsSelected = false;
  public searchFilter = '';
  public filteredData: DatatableData[] = [];
  public expandedRows: DatatableData[] = [];

  protected _data: DatatableData[] = [];

  private sortableColumns: string[] = [];

  constructor(
    private clipboard: Clipboard,
    private ngZone: NgZone,
    private notificationService: NotificationService,
    private userLocalStorageService: UserLocalStorageService
  ) {}

  @Input()
  get data(): DatatableData[] {
    return this._data;
  }

  set data(data: DatatableData[]) {
    this._data = data;
    this.applyFilters();
    this.updateSelection();
  }

  @Throttle(1000)
  onSearchFilterChange(event: Event): void {
    this.searchFilter = (event.target as HTMLInputElement).value;
    this.applyFilters();
    this.updateSelection();
  }

  ngOnInit(): void {
    this.initTemplates();
    if (this.columns) {
      if (this.hasExpandableRows) {
        // Check if the template is defined.
        if (!this.expandedRowTpl) {
          throw new Error(
            'Failed to find the expandable rows template. Did you have specified a "ng-template" with the "s3gw-datatable-expanded-row-template" directive?'
          );
        }
        // Add column configuration.
        this.columns.unshift({
          name: '',
          prop: '',
          cellTemplateName: DatatableCellTemplateName.rowExpandable
        });
      }

      // Add 'Checkbox' column if `selectionType` is `single` and `multi.
      if (this.selectionType !== 'none') {
        if (!_.find(this.columns, ['prop', this.identifier])) {
          throw new Error(`Identifier "${this.identifier}" not found in defined columns.`);
        }
        this.columns.unshift({
          name: '',
          prop: '',
          cellTemplateName: DatatableCellTemplateName.rowSelect
        });
      }

      // Sanitize the columns.
      _.forEach(this.columns, (column: DatatableColumn) => {
        _.defaultsDeep(column, {
          hidden: false,
          sortable: true
        });
        column.css = ['s3gw-text-no-overflow', column.css].join(' ').trim();
        if (_.isString(column.cellTemplateName)) {
          column.cellTemplate = this.cellTemplates[column.cellTemplateName];
          switch (column.cellTemplateName) {
            case 'actionMenu':
            case 'rowExpandable':
            case 'rowSelect':
              column.name = '';
              column.prop = '';
              column.sortable = false;
              column.width = '70px';
              column.css = '';
              column.align = 'center';
              break;
          }
        }
      });
    }
    if (_.isInteger(this.autoReload) && this.autoReload > 0) {
      this.ngZone.runOutsideAngular(() => {
        this.subscriptions.add(
          timer(0, this.autoReload as number).subscribe(() => {
            this.ngZone.run(() => this.reloadData());
          })
        );
      });
    } else if (!this.autoReload) {
      // Fixes 'ExpressionChangedAfterItHasBeenCheckedError'
      setTimeout(() => {
        this.reloadData();
      }, 0);
    }
    this.sortableColumns = this.columns
      .filter((c) => c.sortable === true && this.getSortProp(c))
      .map((c) => this.getSortProp(c));
    if (!this.sortHeader && this.sortableColumns.length > 0) {
      this.sortHeader = this.sortableColumns[0];
    }
    this.restoreState();
    this.applyFilters();
  }

  initTemplates() {
    this.cellTemplates = {
      icon: this.iconTpl!,
      checkIcon: this.checkIconTpl!,
      yesNoIcon: this.yesNoIconTpl!,
      rowExpandable: this.rowExpandableTpl!,
      rowSelect: this.rowSelectTpl!,
      actionMenu: this.actionMenuTpl!,
      map: this.mapTpl!,
      badge: this.badgeTpl!,
      localeDateTime: this.localeDateTimeTpl!,
      button: this.buttonTpl!,
      binaryUnit: this.binaryUnitTpl!,
      copyToClipboard: this.copyToClipboardTpl!,
      masked: this.maskedTpl!
    };
  }

  renderCellValue(row: DatatableData, column: DatatableColumn): any {
    let value = _.get(row, column.prop);
    if (column.pipe && _.isFunction(column.pipe.transform)) {
      value = column.pipe.transform(value);
    }
    if (column.cellTemplateName === DatatableCellTemplateName.rowSelect) {
      const item = _.find(this.selected, [this.identifier, row[this.identifier]]);
      if (item) {
        value = true;
      }
    }
    if (column.cellTemplateName === DatatableCellTemplateName.rowExpandable) {
      const item = _.find(this.expandedRows, [this.identifier, row[this.identifier]]);
      if (item) {
        value = true;
      }
    }
    return value;
  }

  renderCellDisabled(row: DatatableData, column: DatatableColumn): any {
    if (column.cellTemplateName === DatatableCellTemplateName.rowSelect) {
      if (this.selectionType === 'single') {
        const item = _.find(this.selected, [this.identifier, row[this.identifier]]);
        if (!item && this.selected.length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  setHeaderClasses(column: DatatableColumn): string {
    let css = column.css || '';
    if (column.sortable !== true) {
      return css;
    }
    css += ' sortable';
    if (this.sortHeader !== this.getSortProp(column)) {
      return css;
    }
    return css + ` sort-header ${this.sortDirection}`;
  }

  getHeaderIconCss(): string {
    const css = 'mdi mdi-';
    return this.sortDirection === SortDirection.ascending
      ? css + 'sort-ascending'
      : css + 'sort-descending';
  }

  reloadData(): void {
    this.loadData.emit();
  }

  onSortChange(c: DatatableColumn): void {
    const prop = this.getSortProp(c);
    if (!this.sortableColumns.includes(prop)) {
      return;
    }
    if (prop === this.sortHeader) {
      this.sortDirection =
        this.sortDirection === SortDirection.descending
          ? SortDirection.ascending
          : SortDirection.descending;
    } else {
      this.sortHeader = prop;
      this.sortDirection = SortDirection.ascending;
    }
    this.saveState();
    this.applyFilters();
    this.updateSelection();
  }

  onToggleColumn(column: DatatableColumn): void {
    column.hidden = !column.hidden;
    this.saveState();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.applyFilters();
    this.updateSelection();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.saveState();
    this.applyFilters();
    this.updateSelection();
  }

  onCopyToClipboard(event: Event, value: any, column: DatatableColumn): void {
    event.stopPropagation();
    const success = this.clipboard.copy(value);
    if (success) {
      this.notificationService.showSuccess(
        format(TEXT('Successfully copied "{{ text }}" to the clipboard.'), {
          text: translate(column.name)
        })
      );
    } else {
      this.notificationService.showError(
        format(TEXT('Failed to copy "{{ text }}" to the clipboard.'), {
          text: translate(column.name)
        })
      );
    }
  }

  clearSearchFilter(): void {
    this.searchFilter = '';
    this.applyFilters();
    this.updateSelection();
  }

  onHeaderSelectRows(event: any): void {
    if (this.isAllRowsSelected) {
      this.selected.splice(0, this.selected.length);
    } else {
      this.selected.splice(0, this.selected.length, ...this.filteredData);
    }
    this.selectionChange.emit(this.selected);
    this.updateIsAllRowsSelected();
  }

  onSelectRow(row: DatatableData, column: DatatableColumn): void {
    this.rowSelection.emit([row, column]);
    const selectedIndex = _.findIndex(this.selected, [this.identifier, row[this.identifier]]);
    if (-1 === selectedIndex) {
      switch (this.selectionType) {
        case 'multi':
          this.selected.push(row);
          break;
        default:
          this.selected.splice(0, this.selected.length, row);
          break;
      }
    } else {
      if (selectedIndex >= 0) {
        this.selected.splice(selectedIndex, 1);
      }
    }
    this.selectionChange.emit(this.selected);
    this.updateIsAllRowsSelected();
  }

  onToggleRowExpansion(event: Event, row: DatatableData): void {
    event.stopPropagation();
    const index = _.findIndex(this.expandedRows, [this.identifier, row[this.identifier]]);
    if (-1 === index) {
      this.expandedRows.push(row);
    } else {
      this.expandedRows.splice(index, 1);
    }
    this.expandedRowsChange.emit(this.expandedRows);
  }

  clearSelection(): void {
    this.selected.splice(0, this.selected.length);
    this.updateIsAllRowsSelected();
  }

  updateSelection(): void {
    const newSelection: DatatableData[] = [];
    this.selected.forEach((selectedItem) => {
      const item = _.find(this.filteredData, [this.identifier, selectedItem[this.identifier]]);
      if (item) {
        newSelection.push(item);
      }
    });
    this.selected.splice(0, this.selected.length, ...newSelection);
    this.updateIsAllRowsSelected();
  }

  private applyFilters(): void {
    // Filter the data according the following rules:
    // 1. Order the data according the given criteria (column sorting).
    // 2. Get the data that is displayed on the given page (pagination).
    // 3. Apply the given search filter.
    const filteredData = _.orderBy(this.data, [this.sortHeader], [this.sortDirection])
      .slice((this.page - 1) * this.pageSize, (this.page - 1) * this.pageSize + this.pageSize)
      .filter((o: DatatableData) =>
        _.some(this.columns, (column: DatatableColumn) => {
          let value = _.get(o, column.prop);
          if (!_.isUndefined(column.pipe)) {
            value = column.pipe.transform(value);
          }
          if (value === '' || _.isUndefined(value) || _.isNull(value)) {
            return false;
          }
          if (_.isObjectLike(value)) {
            value = JSON.stringify(value);
          } else if (_.isArray(value)) {
            value = _.join(value, ' ');
          } else if (_.isNumber(value) || _.isBoolean(value)) {
            value = value.toString();
          }
          return _.includes(_.lowerCase(value), _.lowerCase(this.searchFilter));
        })
      );
    if (
      filteredData.length !== this.filteredData.length ||
      !_.isEqual(filteredData, this.filteredData)
    ) {
      this.filteredData = filteredData;
      // Reset the list of expanded rows.
      this.expandedRows = [];
    }
  }

  private updateIsAllRowsSelected(): void {
    this.isAllRowsSelected =
      this.selected.length > 0 && this.selected.length === this.filteredData.length;
  }

  private getSortProp(column: DatatableColumn): string {
    return column.compareProp || column.prop;
  }

  private appendCss(column: DatatableColumn, css: string) {
    column.css = column.css ? `${column.css} ${css}` : css;
  }

  private saveState(): void {
    if (!this.stateId) {
      return;
    }
    const columnsConfig: Record<string, any>[] = [];
    _.forEach(_.filter(this.columns, 'name'), (column: DatatableColumn) => {
      columnsConfig.push({
        name: column.name,
        hidden: column.hidden
      });
    });
    const settings: Record<string, any> = {
      columns: columnsConfig,
      pageSize: this.pageSize
    };
    if (_.isString(this.sortHeader)) {
      settings['sortHeader'] = this.sortHeader;
    }
    if (_.isString(this.sortDirection)) {
      settings['sortDirection'] = this.sortDirection;
    }
    this.userLocalStorageService.set(`datatable_state_${this.stateId}`, JSON.stringify(settings));
  }

  private restoreState(): void {
    if (!this.stateId) {
      return;
    }
    const value = this.userLocalStorageService.get(`datatable_state_${this.stateId}`);
    if (_.isString(value)) {
      const settings: Record<string, any> = JSON.parse(value);
      this.pageSize = settings['pageSize'];
      if (_.isString(settings['sortHeader'])) {
        this.sortHeader = settings['sortHeader'];
      }
      if (_.isString(settings['sortDirection'])) {
        this.sortDirection =
          settings['sortDirection'] === SortDirection.descending
            ? SortDirection.descending
            : SortDirection.ascending;
      }
      _.forEach(settings['columns'], (columnConfig: Record<string, any>) => {
        const column = _.find(this.columns, ['name', _.get(columnConfig, 'name')]);
        if (column) {
          _.merge(column, columnConfig);
        }
      });
    }
  }
}
