/* eslint-disable no-underscore-dangle */
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, Input, OnInit } from '@angular/core';

import { Icon } from '~/app/shared/enum/icon.enum';

@Component({
  selector: 's3gw-alert-panel',
  templateUrl: './alert-panel.component.html',
  styleUrls: ['./alert-panel.component.scss']
})
export class AlertPanelComponent implements OnInit {
  @Input()
  type: 'success' | 'info' | 'warning' | 'danger' | 'hint' = 'danger';

  public bsType = 'danger';
  public icons = Icon;

  private _noColor = false;

  @Input()
  get noColor(): boolean {
    return this._noColor;
  }
  set noColor(value: BooleanInput) {
    this._noColor = coerceBooleanProperty(value);
  }

  ngOnInit(): void {
    switch (this.type) {
      case 'success':
        this.bsType = 'success';
        break;
      case 'info':
        this.bsType = 'info';
        break;
      case 'warning':
        this.bsType = 'warning';
        break;
      case 'danger':
        this.bsType = 'danger';
        break;
      case 'hint':
        this.bsType = 'info';
        break;
    }
  }
}
