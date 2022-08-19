import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { PagesModule } from '~/app/pages/pages.module';
import { UserFormPageComponent } from '~/app/pages/user/user-form-page/user-form-page.component';
import { TestingModule } from '~/app/testing.module';

describe('UserFormPageComponent', () => {
  let component: UserFormPageComponent;
  let fixture: ComponentFixture<UserFormPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserFormPageComponent],
      imports: [PagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
