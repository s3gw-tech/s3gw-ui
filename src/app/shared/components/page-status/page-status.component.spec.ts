import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { PageStatusComponent } from '~/app/shared/components/page-status/page-status.component';
import { TestingModule } from '~/app/testing.module';

describe('PageStatusComponent', () => {
  let component: PageStatusComponent;
  let fixture: ComponentFixture<PageStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
