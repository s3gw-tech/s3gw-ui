import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { S3BucketService } from '~/app/shared/services/api/s3-bucket.service';

@Component({
  selector: 's3gw-dashboard-widget-user-buckets',
  templateUrl: './user-buckets-widget.component.html',
  styleUrls: ['./user-buckets-widget.component.scss']
})
export class UserBucketsWidgetComponent {
  public data = 0;
  public icons = Icon;

  constructor(private s3BucketService: S3BucketService) {}

  loadData(): Observable<number> {
    return this.s3BucketService.count();
  }

  updateData(data: number): void {
    this.data = data;
  }
}
