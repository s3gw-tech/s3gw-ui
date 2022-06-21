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
    TranslocoTestingModule
  ],
  exports: [RouterTestingModule],
  providers: [{ provide: TRANSLOCO_MISSING_HANDLER, useClass: TestingTranslocoMissingHandler }]
})
export class TestingModule {}
