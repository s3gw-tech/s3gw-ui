import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { DashboardWidgetComponent } from '~/app/shared/components/dashboard-widget/dashboard-widget.component';
import { TestingModule } from '~/app/testing.module';

describe('DashboardWidgetComponent', () => {
  let component: DashboardWidgetComponent;
  let fixture: ComponentFixture<DashboardWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardWidgetComponent],
      imports: [ComponentsModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardWidgetComponent);
    component = fixture.componentInstance;
    component.loadData = () => of([]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
