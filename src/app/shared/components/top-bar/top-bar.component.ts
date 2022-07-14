import { Component, EventEmitter, Output } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { ModelComponent } from '~/app/shared/components/modal/model.component';
import { AuthService } from '~/app/shared/services/api/auth.service';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent {
  @Output()
  readonly toggleNavigation = new EventEmitter<any>();

  constructor(private authService: AuthService, private dialogService: DialogService) {}

  onToggleNavigation(): void {
    this.toggleNavigation.emit();
  }

  onLogout(): void {
    this.dialogService.open(
      ModelComponent,
      (res: boolean) => {
        if (res) {
          this.authService.logout().subscribe();
        }
      },
      {
        type: 'yesNo',
        icon: 'question',
        message: TEXT('Do you really want to sign out?')
      }
    );
  }
}
