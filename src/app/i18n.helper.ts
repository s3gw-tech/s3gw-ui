import { TranslocoService } from '@ngneat/transloco';
import * as _ from 'lodash';

let translocoService: TranslocoService;

export const setTranslationService = (service: TranslocoService) => {
  translocoService = service;
};

/**
 * Translate a string instantly.
 */
export const translate = (text: string): string =>
  _.isUndefined(translocoService) ? text : translocoService.translate(text);

/**
 * Translates strings and maps original name as object attribute name.
 *
 * Recommend to be only used for single words. Like 'Used', 'Free', 'Hostname' ...
 */
export const translateWords = (words: string[]): { [word: string]: string } => {
  const o = {};
  words.forEach((word) => {
    // @ts-ignore
    o[word] = translate(word);
  });
  return o;
};

export const supportedLanguages: Record<string, string> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  en_US: 'English',
  de_DE: 'Deutsch'
};

/**
 * Get the current configured language. If not set in local storage,
 * then try to get the default browser language. Finally fall back
 * to the specified default language. Defaults to 'en_US'.
 */
export const getCurrentLanguage = (defaultValue = 'en_US'): string => {
  // Get the stored language from local storage.
  let lang = localStorage.getItem('language');
  // If not set, try to detect the browser language.
  if (_.isNull(lang)) {
    if (_.isArray(navigator.languages)) {
      lang = _.chain<string>(navigator.languages)
        .filter((l: string) => l.includes('-'))
        .map((l: string) => l.replace('-', '_'))
        .filter((l: string) => _.has(supportedLanguages, l))
        .first()
        .value();
    }
  }
  return _.defaultTo(lang, defaultValue);
};

export const setCurrentLanguage = (lang: string): void => {
  localStorage.setItem('language', lang);
};
