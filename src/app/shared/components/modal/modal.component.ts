import { Component, Inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';

import { Icon } from '~/app/shared/enum/icon.enum';
import { S3GW_MODAL_DATA } from '~/app/shared/services/dialog.service';

export type ModalConfig = {
  type: 'ok' | 'okCancel' | 'yesNo';
  icon?: 'info' | 'warning' | 'danger' | 'question';
  title?: string;
  message: string;
};

@Component({
  selector: 's3gw-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {
  public config!: ModalConfig;

  public button1Text!: string;
  public button1Result?: any;
  public button1Class?: string;
  public button1Visible = false;
  public button2Text!: string;
  public button2Result?: any;
  public button2Class?: string;
  public button2Visible = false;
  public iconClass?: string;

  private icons = Icon;

  constructor(public ngbActiveModal: NgbActiveModal, @Inject(S3GW_MODAL_DATA) config: ModalConfig) {
    this.config = config;
  }

  ngOnInit(): void {
    this.button1Class = 'btn-outline-secondary';
    this.button2Class = 'btn-outline-secondary';
    switch (this.config.type) {
      case 'ok':
        this.button1Text = TEXT('OK');
        this.button1Result = true;
        this.button1Visible = true;
        this.button1Class = 'btn-submit';
        break;
      case 'okCancel':
        this.button1Text = TEXT('OK');
        this.button1Result = true;
        this.button1Visible = true;
        this.button1Class = 'btn-submit';
        this.button2Text = TEXT('Cancel');
        this.button2Result = false;
        this.button2Visible = true;
        break;
      case 'yesNo':
        this.button1Text = TEXT('Yes');
        this.button1Result = true;
        this.button1Visible = true;
        this.button1Class = 'btn-submit';
        this.button2Text = TEXT('No');
        this.button2Result = false;
        this.button2Visible = true;
        break;
    }
    switch (this.config.icon) {
      case 'info':
        this.iconClass = `${this.icons.info} s3gw-color-info`;
        break;
      case 'warning':
        this.iconClass = `${this.icons.warning} s3gw-color-warning`;
        this.button1Class = _.replace(this.button1Class, 'btn-submit', 'btn-warning');
        break;
      case 'danger':
        this.iconClass = `${this.icons.danger} s3gw-color-danger`;
        this.button1Class = _.replace(this.button1Class, 'btn-submit', 'btn-danger');
        break;
      case 'question':
        this.iconClass = `${this.icons.question} s3gw-color-info`;
    }
  }

  onButtonClick(result: any): void {
    this.ngbActiveModal.close(result);
  }
}
