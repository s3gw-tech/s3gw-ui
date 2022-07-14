import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagesModule } from '~/app/pages/pages.module';
import { UserFormPageComponent } from '~/app/pages/user/user-form-page/user-form-page.component';
import { TestingModule } from '~/app/testing.module';

describe('UserFormPageComponent', () => {
  let component: UserFormPageComponent;
  let fixture: ComponentFixture<UserFormPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule, TestingModule]
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
