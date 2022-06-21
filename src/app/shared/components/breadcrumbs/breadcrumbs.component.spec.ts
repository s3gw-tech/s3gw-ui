import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreadcrumbsComponent } from '~/app/shared/components/breadcrumbs/breadcrumbs.component';
import { ComponentsModule } from '~/app/shared/components/components.module';
import { TestingModule } from '~/app/testing.module';

describe('BreadcrumbsComponent', () => {
  let component: BreadcrumbsComponent;
  let fixture: ComponentFixture<BreadcrumbsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BreadcrumbsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
