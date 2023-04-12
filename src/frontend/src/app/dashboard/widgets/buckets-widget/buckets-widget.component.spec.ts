import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { BucketsWidgetComponent } from '~/app/dashboard/widgets/buckets-widget/buckets-widget.component';
import { TestingModule } from '~/app/testing.module';

describe('BucketsWidgetComponent', () => {
  let component: BucketsWidgetComponent;
  let fixture: ComponentFixture<BucketsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BucketsWidgetComponent],
      imports: [DashboardModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BucketsWidgetComponent);
    component = fixture.componentInstance;
    component.loadData = () => of(2);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
