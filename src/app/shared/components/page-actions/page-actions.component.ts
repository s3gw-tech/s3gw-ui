import { Component, Input } from '@angular/core';
import * as _ from 'lodash';

import { PageAction } from '~/app/shared/models/page-action.type';

@Component({
  selector: 's3gw-page-actions',
  templateUrl: './page-actions.component.html',
  styleUrls: ['./page-actions.component.scss']
})
export class PageActionsComponent {
  @Input()
  actions?: PageAction[];

  constructor() {}

  onAction(event: any, action: PageAction): void {
    if (_.isFunction(action.callback)) {
      action.callback(event);
    }
  }
}
