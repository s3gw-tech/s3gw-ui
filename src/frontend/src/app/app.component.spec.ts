import { TestBed } from '@angular/core/testing';

import { AppComponent } from '~/app/app.component';
import { SharedModule } from '~/app/shared/shared.module';
import { TestingModule } from '~/app/testing.module';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule, TestingModule],
      declarations: [AppComponent]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
