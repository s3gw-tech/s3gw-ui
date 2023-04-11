import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { AdminOpsUserService } from '~/app/shared/services/api/admin-ops-user.service';

@Component({
  selector: 's3gw-dashboard-widget-users',
  templateUrl: './users-widget.component.html',
  styleUrls: ['./users-widget.component.scss']
})
export class UsersWidgetComponent {
  public data = 0;
  public icons = Icon;

  constructor(private userService: AdminOpsUserService) {}

  loadData(): Observable<number> {
    return this.userService.count();
  }

  updateData(data: number): void {
    this.data = data;
  }
}
