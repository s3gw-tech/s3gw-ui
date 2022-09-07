import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { UsersWidgetComponent } from '~/app/dashboard/widgets/users-widget/users-widget.component';
import { TestingModule } from '~/app/testing.module';

describe('UsersWidgetComponent', () => {
  let component: UsersWidgetComponent;
  let fixture: ComponentFixture<UsersWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsersWidgetComponent],
      imports: [DashboardModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersWidgetComponent);
    component = fixture.componentInstance;
    component.loadData = () => of([]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
