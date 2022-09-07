import { NgModule } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';

import { BucketsWidgetComponent } from '~/app/dashboard/widgets/buckets-widget/buckets-widget.component';
import { UsersWidgetComponent } from '~/app/dashboard/widgets/users-widget/users-widget.component';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [UsersWidgetComponent, BucketsWidgetComponent],
  exports: [BucketsWidgetComponent, UsersWidgetComponent],
  imports: [TranslocoModule, SharedModule]
})
export class DashboardModule {}
