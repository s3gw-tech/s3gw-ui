import { Component, EventEmitter, Output } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { ModalComponent } from '~/app/shared/components/modal/modal.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { ViewMode } from '~/app/shared/enum/view-mode.enum';
import { AuthService } from '~/app/shared/services/api/auth.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { NavigationConfigService } from '~/app/shared/services/navigation-config.service';

@Component({
  selector: 's3gw-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent {
  @Output()
  readonly toggleNavigation = new EventEmitter<any>();

  public userId: string | null;
  public isAdmin: boolean;
  public viewMode: ViewMode;
  public viewModes = ViewMode;
  public icons = Icon;

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private dialogService: DialogService,
    private navigationConfigService: NavigationConfigService
  ) {
    this.viewMode = this.navigationConfigService.currentViewMode;
    this.userId = this.authStorageService.getUserId();
    this.isAdmin = this.authStorageService.isAdmin();
  }

  onToggleNavigation(): void {
    this.toggleNavigation.emit();
  }

  onToggleViewMode(event: Event): void {
    const checked: boolean = (event.target as HTMLInputElement).checked;
    this.viewMode = checked ? ViewMode.admin : ViewMode.user;
    this.navigationConfigService.setViewMode(this.viewMode);
  }

  onLogout(): void {
    this.dialogService.open(
      ModalComponent,
      (res: boolean) => {
        if (res) {
          this.authService.logout().subscribe();
        }
      },
      {
        type: 'yesNo',
        icon: 'question',
        message: TEXT('Do you really want to log out?')
      }
    );
  }
}
