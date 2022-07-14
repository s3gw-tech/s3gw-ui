import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserKeyFormPageComponent } from './user-key-form-page.component';

describe('UserKeyFormPageComponent', () => {
  let component: UserKeyFormPageComponent;
  let fixture: ComponentFixture<UserKeyFormPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserKeyFormPageComponent]
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
