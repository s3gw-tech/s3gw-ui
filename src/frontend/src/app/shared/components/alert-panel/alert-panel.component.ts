/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/member-ordering */
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

  @Input()
  get noColor(): boolean {
    return this._noColor;
  }
  set noColor(value: BooleanInput) {
    this._noColor = coerceBooleanProperty(value);
  }

  @Input()
  get noIcon(): boolean {
    return this._noIcon;
  }
  set noIcon(value: BooleanInput) {
    this._noIcon = coerceBooleanProperty(value);
  }

  @Input()
  get noMargin(): boolean {
    return this._noMargin;
  }
  set noMargin(value: BooleanInput) {
    this._noMargin = coerceBooleanProperty(value);
  }

  @Input()
  get noRadius(): boolean {
    return this._noRadius;
  }
  set noRadius(value: BooleanInput) {
    this._noRadius = coerceBooleanProperty(value);
  }

  public bsType = 'danger';
  public icons = Icon;

  private _noColor = false;
  private _noIcon = false;
  private _noMargin = false;
  private _noRadius = false;

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
