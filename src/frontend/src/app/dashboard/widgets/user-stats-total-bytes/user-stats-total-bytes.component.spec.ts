import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { TestingModule } from '~/app/testing.module';

import { UserStatsTotalBytesComponent } from './user-stats-total-bytes.component';

describe('UserStatsTotalBytesComponent', () => {
  let component: UserStatsTotalBytesComponent;
  let fixture: ComponentFixture<UserStatsTotalBytesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserStatsTotalBytesComponent],
      imports: [DashboardModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserStatsTotalBytesComponent);
    component = fixture.componentInstance;
    component.loadData = () =>
      of({
        /* eslint-disable @typescript-eslint/naming-convention */
        Entries: [],
        Summary: [-1, 1000, -1, -1, -1, 122028, 147456, 10],
        CapacityUsed: []
        /* eslint-enable @typescript-eslint/naming-convention */
      });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
