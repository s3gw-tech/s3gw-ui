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
        Summary: {},
        TotalBytes: 4096,
        TotalBytesRounded: 1,
        TotalEntries: 5
        /* eslint-enable @typescript-eslint/naming-convention */
      });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
