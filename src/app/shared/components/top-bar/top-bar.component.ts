import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { DialogComponent } from '~/app/shared/components/dialog/dialog.component';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent {
  @Output()
  readonly toggleNavigation = new EventEmitter<any>();

  constructor(private dialogService: DialogService, private router: Router) {}

  onToggleNavigation(): void {
    this.toggleNavigation.emit();
  }

  onLogout(): void {
    this.dialogService.open(
      DialogComponent,
      (res: boolean) => {
        // ToDo...
      },
      {
        type: 'yesNo',
        icon: 'question',
        message: TEXT('Do you really want to sign out?')
      }
    );
  }
}
