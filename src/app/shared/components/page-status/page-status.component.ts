import { Component, Input } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

export enum PageStatus {
  none = 0,
  ready = 1,
  loading = 2,
  loadingError = 3,
  saving = 4,
  savingError = 5
}

@Component({
  selector: 's3gw-page-status',
  templateUrl: './page-status.component.html',
  styleUrls: ['./page-status.component.scss']
})
export class PageStatusComponent {
  @Input()
  pageStatus: PageStatus = PageStatus.ready;

  @Input()
  loadingErrorText? = TEXT('Failed to load data.');

  @Input()
  savingErrorText? = TEXT('Failed to save data.');
}
