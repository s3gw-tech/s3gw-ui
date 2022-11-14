import { Injectable } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { BehaviorSubject, Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { NavigationItem } from '~/app/shared/models/navigation-item.type';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
@Injectable({
  providedIn: 'root'
})
export class NavigationConfigService {
  public readonly items$: Observable<NavigationItem[]>;

  private itemsSource = new BehaviorSubject<NavigationItem[]>([]);

  constructor(private authStorageService: AuthStorageService) {
    const items: NavigationItem[] = [
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
    ];
    if (authStorageService.isAdmin()) {
      items.push({
        text: TEXT('Administration'),
        icon: Icon.cog,
        expanded: false,
        children: [
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
      });
    }
    this.items$ = this.itemsSource.asObservable();
    this.itemsSource.next(items);
  }
}
