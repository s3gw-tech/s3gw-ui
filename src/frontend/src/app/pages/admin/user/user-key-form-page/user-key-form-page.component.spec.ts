import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { AdminPagesModule } from '~/app/pages/admin/admin-pages.module';
import { UserKeyFormPageComponent } from '~/app/pages/admin/user/user-key-form-page/user-key-form-page.component';
import { TestingModule } from '~/app/testing.module';

describe('UserKeyFormPageComponent', () => {
  let component: UserKeyFormPageComponent;
  let fixture: ComponentFixture<UserKeyFormPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserKeyFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
