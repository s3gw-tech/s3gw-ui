import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { UserBucketsWidgetComponent } from '~/app/dashboard/widgets/user-buckets-widget/user-buckets-widget.component';
import { TestingModule } from '~/app/testing.module';

describe('UserBucketsWidgetComponent', () => {
  let component: UserBucketsWidgetComponent;
  let fixture: ComponentFixture<UserBucketsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserBucketsWidgetComponent],
      imports: [DashboardModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserBucketsWidgetComponent);
    component = fixture.componentInstance;
    component.loadData = () => of(10);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
