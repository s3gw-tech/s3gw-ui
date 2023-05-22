import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { ObjectVersionDatatablePageComponent } from '~/app/pages/user/object/object-version-datatable-page/object-version-datatable-page.component';
import { UserPagesModule } from '~/app/pages/user/user-pages.module';
import { TestingModule } from '~/app/testing.module';

describe('ObjectVersionDatatablePageComponent', () => {
  let component: ObjectVersionDatatablePageComponent;
  let fixture: ComponentFixture<ObjectVersionDatatablePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ObjectVersionDatatablePageComponent],
      imports: [TestingModule, ToastrModule.forRoot(), UserPagesModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectVersionDatatablePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
