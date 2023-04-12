import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { TestingModule } from '~/app/testing.module';

describe('DeclarativeFormComponent', () => {
  let component: DeclarativeFormComponent;
  let fixture: ComponentFixture<DeclarativeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, ToastrModule.forRoot(), TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeclarativeFormComponent);
    component = fixture.componentInstance;
    Object.assign(component, {
      config: {
        fields: [
          {
            type: 'text',
            name: 'username',
            value: '',
            modifiers: [
              {
                type: 'readonly',
                constraint: {
                  operator: 'eq',
                  arg0: { prop: 'fullname' },
                  arg1: 'foo'
                }
              }
            ]
          },
          {
            type: 'text',
            name: 'fullname',
            value: '',
            modifiers: [
              {
                type: 'value',
                constraint: {
                  operator: 'truthy',
                  arg0: { prop: 'disabled' }
                },
                data: 'foo'
              }
            ]
          },
          {
            type: 'checkbox',
            name: 'disabled',
            value: false
          }
        ]
      }
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply modifiers', () => {
    component.patchValues({
      disabled: true
    });
    const values = component.values;
    expect(values['fullname']).toBe('foo');
    expect(component.formGroup?.controls['username'].disabled).toBeTruthy();
  });
});
