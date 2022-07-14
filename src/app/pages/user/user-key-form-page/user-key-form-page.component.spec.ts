import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { PagesModule } from '~/app/pages/pages.module';
import { UserKeyFormPageComponent } from '~/app/pages/user/user-key-form-page/user-key-form-page.component';
import { TestingModule } from '~/app/testing.module';

describe('UserKeyFormPageComponent', () => {
  let component: UserKeyFormPageComponent;
  let fixture: ComponentFixture<UserKeyFormPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule, TestingModule, ToastrModule.forRoot()]
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
