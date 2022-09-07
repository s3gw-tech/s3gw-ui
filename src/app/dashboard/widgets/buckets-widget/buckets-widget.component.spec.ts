import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      imports: [DashboardModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BucketsWidgetComponent);
    component = fixture.componentInstance;
    component.loadData = () => of([]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
