import { HttpClient } from '@angular/common/http';
import { Injectable, NgModule } from '@angular/core';
import {
  DefaultTranspiler,
  Translation,
  TRANSLOCO_CONFIG,
  TRANSLOCO_LOADER,
  TRANSLOCO_TRANSPILER,
  translocoConfig,
  TranslocoLoader,
  TranslocoModule
} from '@ngneat/transloco';
import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { supportedLanguages } from '~/app/i18n.helper';
import { environment } from '~/environments/environment';

@Injectable({ providedIn: 'root' })
class CustomLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  public getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`assets/i18n/${lang}.json`);
  }
}

@Injectable({ providedIn: 'root' })
class CustomTranspiler extends DefaultTranspiler {
  public override transpile(
    value: any,
    params: Record<string, any>,
    translation: Translation
  ): any {
    return value;
  }
}

@NgModule({
  exports: [TranslocoModule],
  providers: [
    {
      provide: TRANSLOCO_CONFIG,
      useValue: translocoConfig({
        availableLangs: _.keys(supportedLanguages),
        defaultLang: 'en_US',
        reRenderOnLangChange: true,
        prodMode: environment.production,
        missingHandler: { allowEmpty: true, logMissingKey: false }
      })
    },
    { provide: TRANSLOCO_LOADER, useClass: CustomLoader },
    { provide: TRANSLOCO_TRANSPILER, useClass: CustomTranspiler }
  ]
})
export class TranslocoRootModule {}
