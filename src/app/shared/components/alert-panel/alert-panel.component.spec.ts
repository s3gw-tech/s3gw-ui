import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertPanelComponent } from '~/app/shared/components/alert-panel/alert-panel.component';
import { SharedModule } from '~/app/shared/shared.module';
import { TestingModule } from '~/app/testing.module';

describe('AlertPanelComponent', () => {
  let component: AlertPanelComponent;
  let fixture: ComponentFixture<AlertPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
