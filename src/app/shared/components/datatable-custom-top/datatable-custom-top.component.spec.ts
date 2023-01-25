import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatatableCustomTopComponent } from '~/app/shared/components/datatable-custom-top/datatable-custom-top.component';

describe('DatatableCustomTopComponent', () => {
  let component: DatatableCustomTopComponent;
  let fixture: ComponentFixture<DatatableCustomTopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatatableCustomTopComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatatableCustomTopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
