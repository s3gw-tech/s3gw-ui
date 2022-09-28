import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { Bucket, BucketService } from '~/app/shared/services/api/bucket.service';

@Component({
  selector: 's3gw-dashboard-widget-buckets',
  templateUrl: './buckets-widget.component.html',
  styleUrls: ['./buckets-widget.component.scss']
})
export class BucketsWidgetComponent {
  public data: Bucket[] = [];
  public icons = Icon;

  constructor(private bucketService: BucketService) {}

  loadData(): Observable<Bucket[]> {
    return this.bucketService.list();
  }

  updateData(data: Bucket[]): void {
    this.data = data;
  }
}
