import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { PagesModule } from '~/app/pages/pages.module';
import { UserKeyDatatablePageComponent } from '~/app/pages/user/user-key-datatable-page/user-key-datatable-page.component';
import { TestingModule } from '~/app/testing.module';

describe('UserKeyDatatablePageComponent', () => {
  let component: UserKeyDatatablePageComponent;
  let fixture: ComponentFixture<UserKeyDatatablePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserKeyDatatablePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
