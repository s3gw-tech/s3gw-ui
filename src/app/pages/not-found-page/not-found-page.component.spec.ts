import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotFoundPageComponent } from '~/app/pages/not-found-page/not-found-page.component';
import { PagesModule } from '~/app/pages/pages.module';
import { TestingModule } from '~/app/testing.module';

describe('NotFoundPageComponent', () => {
  let component: NotFoundPageComponent;
  let fixture: ComponentFixture<NotFoundPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NotFoundPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
