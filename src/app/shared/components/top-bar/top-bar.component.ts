import { Component, EventEmitter, Output } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { ModelComponent } from '~/app/shared/components/modal/model.component';
import { AuthService } from '~/app/shared/services/api/auth.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent {
  @Output()
  readonly toggleNavigation = new EventEmitter<any>();

  userId: string | null;

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private dialogService: DialogService
  ) {
    this.userId = this.authStorageService.getUserId();
  }

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
