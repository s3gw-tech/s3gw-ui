import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';

import { ModalComponent } from '~/app/shared/components/modal/modal.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { AuthService } from '~/app/shared/services/api/auth.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnDestroy {
  @Output()
  readonly toggleNavigation = new EventEmitter<any>();

  public userId: string | null;
  public isAdmin?: boolean;
  public icons = Icon;

  private subscription: Subscription;

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private dialogService: DialogService,
    private router: Router
  ) {
    this.userId = this.authStorageService.getUserId();
    this.subscription = this.router.events
      .pipe(
        filter((x) => x instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe((event: Event) => {
        this.isAdmin = _.startsWith((event as NavigationEnd).urlAfterRedirects, '/admin');
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onToggleNavigation(): void {
    this.toggleNavigation.emit();
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
