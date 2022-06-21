import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { NavigationBarComponent } from '~/app/shared/components/navigation-bar/navigation-bar.component';
import { TestingModule } from '~/app/testing.module';

describe('NavigationBarComponent', () => {
  let component: NavigationBarComponent;
  let fixture: ComponentFixture<NavigationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigationBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
