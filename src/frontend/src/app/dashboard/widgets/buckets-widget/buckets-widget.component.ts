import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { AdminOpsBucketService } from '~/app/shared/services/api/admin-ops-bucket.service';

@Component({
  selector: 's3gw-dashboard-widget-buckets',
  templateUrl: './buckets-widget.component.html',
  styleUrls: ['./buckets-widget.component.scss']
})
export class BucketsWidgetComponent {
  public data = 0;
  public icons = Icon;

  constructor(private bucketService: AdminOpsBucketService) {}

  loadData(): Observable<number> {
    return this.bucketService.count();
  }

  updateData(data: number): void {
    this.data = data;
  }
}
