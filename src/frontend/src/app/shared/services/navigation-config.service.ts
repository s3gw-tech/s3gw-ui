import { Injectable } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Icon } from '~/app/shared/enum/icon.enum';
import { ViewMode } from '~/app/shared/enum/view-mode.enum';
import { NavigationConfig } from '~/app/shared/models/navigation-config.type';

@Injectable({
  providedIn: 'root'
})
export class NavigationConfigService {
  public readonly config$: Observable<NavigationConfig>;

  private itemsSource: BehaviorSubject<NavigationConfig>;

  constructor(private router: Router) {
    this.itemsSource = new BehaviorSubject<NavigationConfig>(this.getConfig(ViewMode.user));
    this.config$ = this.itemsSource.asObservable();
    this.router.events
      .pipe(filter((event: Event) => event instanceof NavigationEnd))
      .subscribe((event: Event) => {
        const url = (event as NavigationEnd).url;
        this.setViewMode(_.startsWith(url, '/admin') ? ViewMode.admin : ViewMode.user);
      });
  }

  get currentViewMode(): ViewMode {
    const config: NavigationConfig = this.itemsSource.value;
    return config.viewMode;
  }

  setViewMode(viewMode: ViewMode, navigate: boolean = false): void {
    this.itemsSource.next(this.getConfig(viewMode));
    if (navigate) {
      const config: NavigationConfig = this.itemsSource.value;
      this.router.navigate([config.startUrl]);
    }
  }

  private getConfig(viewMode: ViewMode): NavigationConfig {
    const configs: NavigationConfig[] = [
      {
        viewMode: ViewMode.admin,
        startUrl: '/admin/dashboard',
        items: [
          {
            text: TEXT('Dashboard'),
            icon: Icon.apps,
            url: '/admin/dashboard'
          },
          {
            text: TEXT('Users'),
            icon: Icon.users,
            url: '/admin/users'
          },
          {
            text: TEXT('Buckets'),
            icon: Icon.bucket,
            url: '/admin/buckets'
          }
        ]
      },
      {
        viewMode: ViewMode.user,
        startUrl: '/dashboard',
        items: [
          {
            text: TEXT('Dashboard'),
            icon: Icon.apps,
            url: '/dashboard'
          },
          {
            text: TEXT('Buckets'),
            icon: Icon.bucket,
            url: '/buckets'
          }
        ]
      }
    ];
    return _.find(configs, ['viewMode', viewMode])!;
  }
}
