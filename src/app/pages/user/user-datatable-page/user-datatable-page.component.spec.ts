import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { PagesModule } from '~/app/pages/pages.module';
import { UserDatatablePageComponent } from '~/app/pages/user/user-datatable-page/user-datatable-page.component';
import { TestingModule } from '~/app/testing.module';

describe('UserDatatablePageComponent', () => {
  let component: UserDatatablePageComponent;
  let fixture: ComponentFixture<UserDatatablePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserDatatablePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
