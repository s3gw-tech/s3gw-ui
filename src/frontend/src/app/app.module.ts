import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslocoService } from '@ngneat/transloco';
import { ToastrModule } from 'ngx-toastr';

import { AppComponent } from '~/app/app.component';
import { AppRoutingModule } from '~/app/app-routing.module';
import { getCurrentLanguage, setTranslationService } from '~/app/i18n.helper';
import { PagesModule } from '~/app/pages/pages.module';
import { AppConfigService } from '~/app/shared/services/app-config.service';
import { HttpErrorInterceptorService } from '~/app/shared/services/http-error-interceptor.service';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';
import { SharedModule } from '~/app/shared/shared.module';
import { TranslocoRootModule } from '~/app/transloco-root.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    PagesModule,
    SharedModule,
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-center',
      preventDuplicates: true,
      enableHtml: true
    }),
    TranslocoRootModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (appConfigService: AppConfigService) => () => appConfigService.load(),
      multi: true,
      deps: [AppConfigService]
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (rgwServiceConfigService: RgwServiceConfigService) => () =>
        rgwServiceConfigService.load(),
      multi: true,
      deps: [RgwServiceConfigService]
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (translocoService: TranslocoService) => () => {
        const language = getCurrentLanguage();
        translocoService.setActiveLang(language);
        setTranslationService(translocoService);
        return translocoService.load(language);
      },
      multi: true,
      deps: [TranslocoService]
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptorService,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
