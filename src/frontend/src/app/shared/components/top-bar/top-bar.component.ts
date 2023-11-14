import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { Subscription } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { ViewMode } from '~/app/shared/enum/view-mode.enum';
import { NavigationConfig } from '~/app/shared/models/navigation-config.type';
import { AuthService } from '~/app/shared/services/api/auth.service';
import { AppConfigService } from '~/app/shared/services/app-config.service';
import { AppMainConfigService } from '~/app/shared/services/app-main-config.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { NavigationConfigService } from '~/app/shared/services/navigation-config.service';

@Component({
  selector: 's3gw-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnDestroy {
  @Output()
  readonly toggleNavigation = new EventEmitter<any>();

  @Output()
  readonly toggleNotifications = new EventEmitter<any>();

  public userId: string | null;
  public isAdmin: boolean;
  public viewMode: ViewMode = ViewMode.user;
  public viewModes = ViewMode;
  public icons = Icon;

  private subscription: Subscription;

  constructor(
    public appConfigService: AppConfigService,
    public appMainConfigService: AppMainConfigService,
    private authService: AuthService,
    private authSessionService: AuthSessionService,
    private modalDialogService: ModalDialogService,
    private navigationConfigService: NavigationConfigService
  ) {
    this.userId = this.authSessionService.getUserId();
    this.isAdmin = this.authSessionService.isAdmin();
    this.subscription = navigationConfigService.config$.subscribe(
      (config: NavigationConfig) => (this.viewMode = config.viewMode)
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onToggleNavigation(event: Event): void {
    event.stopPropagation();
    this.toggleNavigation.emit();
  }

  onToggleNotifications(event: Event): void {
    event.stopPropagation();
    this.toggleNotifications.emit();
  }

  onToggleViewMode(event: Event): void {
    const checked: boolean = (event.target as HTMLInputElement).checked;
    event.stopPropagation();
    this.navigationConfigService.setViewMode(checked ? ViewMode.admin : ViewMode.user, true);
  }

  onLogout(): void {
    this.modalDialogService.yesNo(TEXT('Do you really want to log out?'), (res: boolean) => {
      if (res) {
        this.authService.logout().subscribe();
      }
    });
  }
}
