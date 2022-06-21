import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslocoService } from '@ngneat/transloco';
import { ToastrModule } from 'ngx-toastr';

import { AppComponent } from '~/app/app.component';
import { AppRoutingModule } from '~/app/app-routing.module';
import { getCurrentLanguage, setTranslationService } from '~/app/i18n.helper';
import { PagesModule } from '~/app/pages/pages.module';
import { SharedModule } from '~/app/shared/shared.module';
import { TranslocoRootModule } from '~/app/transloco-root.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    BrowserModule,
    HttpClientModule,
    PagesModule,
    SharedModule,
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-center',
      preventDuplicates: true
    }),
    TranslocoRootModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(translocoService: TranslocoService) {
    const language = getCurrentLanguage();
    translocoService.setActiveLang(language);
    setTranslationService(translocoService);
  }
}
