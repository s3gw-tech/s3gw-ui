import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { BehaviorSubject, Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { ViewMode } from '~/app/shared/enum/view-mode.enum';
import { NavigationItem } from '~/app/shared/models/navigation-item.type';

type NavigationConfigs = {
  [mode: string]: {
    // The URL that is called whenever the view mode is changed.
    startUrl: string;
    items: {
      text: string;
      icon: string;
      url: string;
    }[];
  };
};

@Injectable({
  providedIn: 'root'
})
export class NavigationConfigService {
  public readonly config$: Observable<NavigationItem[]>;

  private viewMode: ViewMode = ViewMode.user;
  private itemsSource: BehaviorSubject<NavigationItem[]>;
  private configs: NavigationConfigs = {
    admin: {
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
    user: {
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
  };

  constructor(private router: Router) {
    this.itemsSource = new BehaviorSubject<NavigationItem[]>([]);
    this.config$ = this.itemsSource.asObservable();
    this.setViewMode(this.viewMode, false);
  }

  get currentViewMode(): ViewMode {
    return this.viewMode;
  }

  setViewMode(viewMode: ViewMode, navigate: boolean = true): void {
    this.viewMode = viewMode;
    this.itemsSource.next(this.configs[this.viewMode].items);
    if (navigate) {
      const url = this.configs[this.viewMode].startUrl;
      this.router.navigate([url]);
    }
  }
}
