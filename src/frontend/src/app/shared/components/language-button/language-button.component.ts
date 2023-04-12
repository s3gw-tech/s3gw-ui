import { Component, Input } from '@angular/core';

import { getCurrentLanguage, setCurrentLanguage, supportedLanguages } from '~/app/i18n.helper';

@Component({
  selector: 's3gw-language-button',
  templateUrl: './language-button.component.html',
  styleUrls: ['./language-button.component.scss']
})
export class LanguageButtonComponent {
  @Input()
  type: 'icon' | 'text' = 'icon';

  public languages = supportedLanguages;
  public currentLanguage: string;

  constructor() {
    this.currentLanguage = getCurrentLanguage();
  }

  onSelectLanguage(language: string): void {
    setCurrentLanguage(language);
    document.location.replace('');
  }
}
