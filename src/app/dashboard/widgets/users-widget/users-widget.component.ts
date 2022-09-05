import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { User, UserService } from '~/app/shared/services/api/user.service';

@Component({
  selector: 's3gw-dashboard-widget-users',
  templateUrl: './users-widget.component.html',
  styleUrls: ['./users-widget.component.scss']
})
export class UsersWidgetComponent {
  public data: User[] = [];

  constructor(private usersService: UserService) {}

  loadData(): Observable<User[]> {
    return this.usersService.list(false);
  }

  updateData(data: User[]): void {
    this.data = data;
  }
}
