import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

import { translate } from '~/app/i18n.helper';

export enum PageStatus {
  none = 0,
  ready = 1,
  loading = 2,
  loadingError = 3,
  saving = 4,
  savingError = 5,
  reloading = 6
}

@Component({
  selector: 's3gw-page-status',
  templateUrl: './page-status.component.html',
  styleUrls: ['./page-status.component.scss']
})
export class PageStatusComponent implements OnChanges, OnDestroy {
  @BlockUI()
  blockUI!: NgBlockUI;

  @Input()
  pageStatus: PageStatus = PageStatus.ready;

  @Input()
  loadingErrorText?: string = TEXT('Failed to load data.');

  @Input()
  savingErrorText?: string = TEXT('Failed to save data.');

  @Input()
  savingText?: string = TEXT('Please wait, saving data ...');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageStatus'].currentValue === PageStatus.saving) {
      this.blockUI.start(translate(this.savingText!));
    }
    if (changes['pageStatus'].previousValue === PageStatus.saving) {
      this.blockUI.stop();
    }
  }

  ngOnDestroy(): void {
    if (this.pageStatus === PageStatus.saving) {
      this.blockUI.stop();
    }
  }
}
