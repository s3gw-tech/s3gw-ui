import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { S3UserService, S3UserStats } from '~/app/shared/services/api/s3-user.service';

@Component({
  selector: 's3gw-user-stats-total-bytes',
  templateUrl: './user-stats-total-bytes.component.html',
  styleUrls: ['./user-stats-total-bytes.component.scss']
})
export class UserStatsTotalBytesComponent {
  public data?: S3UserStats;
  public icons = Icon;

  constructor(private userService: S3UserService) {}

  loadData(): Observable<S3UserStats> {
    return this.userService.stats();
  }

  updateData(data: S3UserStats): void {
    this.data = data;
  }
}
