import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { translate } from '~/app/i18n.helper';
import { PageAction } from '~/app/shared/models/page-action.type';
import { BlockUiService } from '~/app/shared/services/block-ui.service';

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
  selector: 's3gw-page-wrapper',
  templateUrl: './page-wrapper.component.html',
  styleUrls: ['./page-wrapper.component.scss']
})
export class PageWrapperComponent implements OnChanges, OnDestroy {
  @Input()
  pageStatus: PageStatus = PageStatus.ready;

  @Input()
  loadingErrorText?: string = TEXT('Failed to load data.');

  @Input()
  savingErrorText?: string = TEXT('Failed to save data.');

  @Input()
  savingText?: string = TEXT('Please wait, saving data ...');

  @Input()
  actions?: PageAction[] = [];

  constructor(private blockUiService: BlockUiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageStatus'].currentValue === PageStatus.saving) {
      this.blockUiService.start(translate(this.savingText!));
    }
    if (changes['pageStatus'].previousValue === PageStatus.saving) {
      this.blockUiService.stop();
    }
  }

  ngOnDestroy(): void {
    if (this.pageStatus === PageStatus.saving) {
      this.blockUiService.stop();
    }
  }
}
