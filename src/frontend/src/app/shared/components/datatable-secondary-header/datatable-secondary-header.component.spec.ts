import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatatableSecondaryHeaderComponent } from '~/app/shared/components/datatable-secondary-header/datatable-secondary-header.component';

describe('DatatableSecondaryHeaderComponent', () => {
  let component: DatatableSecondaryHeaderComponent;
  let fixture: ComponentFixture<DatatableSecondaryHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatatableSecondaryHeaderComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatatableSecondaryHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
