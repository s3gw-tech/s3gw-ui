import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { ObjectDatatablePageComponent } from '~/app/pages/user/object/object-datatable-page/object-datatable-page.component';
import { UserPagesModule } from '~/app/pages/user/user-pages.module';
import { TestingModule } from '~/app/testing.module';

describe('ObjectDatatablePageComponent', () => {
  let component: ObjectDatatablePageComponent;
  let fixture: ComponentFixture<ObjectDatatablePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ObjectDatatablePageComponent],
      imports: [TestingModule, ToastrModule.forRoot(), UserPagesModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ObjectDatatablePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
