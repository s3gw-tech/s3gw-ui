import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgModule } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import {
  TRANSLOCO_MISSING_HANDLER,
  TranslocoConfig,
  TranslocoMissingHandler,
  TranslocoTestingModule
} from '@ngneat/transloco';

// @ts-ignore
import en from '~/assets/i18n/en_US.json';

export class TestingTranslocoMissingHandler implements TranslocoMissingHandler {
  handle(key: string, config: TranslocoConfig) {
    return key;
  }
}

@NgModule({
  imports: [
    HttpClientTestingModule,
    NoopAnimationsModule,
    RouterTestingModule,
    TranslocoTestingModule.forRoot({
      langs: { en },
      translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
    })
  ],
  exports: [RouterTestingModule],
  providers: [{ provide: TRANSLOCO_MISSING_HANDLER, useClass: TestingTranslocoMissingHandler }]
})
export class TestingModule {}
