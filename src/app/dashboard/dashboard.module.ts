import { NgModule } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';

import { BucketsWidgetComponent } from '~/app/dashboard/widgets/buckets-widget/buckets-widget.component';
import { UserBucketsWidgetComponent } from '~/app/dashboard/widgets/user-buckets-widget/user-buckets-widget.component';
import { UserStatsTotalBytesComponent } from '~/app/dashboard/widgets/user-stats-total-bytes/user-stats-total-bytes.component';
import { UsersWidgetComponent } from '~/app/dashboard/widgets/users-widget/users-widget.component';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [
    UsersWidgetComponent,
    BucketsWidgetComponent,
    UserBucketsWidgetComponent,
    UserStatsTotalBytesComponent
  ],
  exports: [
    BucketsWidgetComponent,
    UsersWidgetComponent,
    UserBucketsWidgetComponent,
    UserStatsTotalBytesComponent
  ],
  imports: [TranslocoModule, SharedModule]
})
export class DashboardModule {}
