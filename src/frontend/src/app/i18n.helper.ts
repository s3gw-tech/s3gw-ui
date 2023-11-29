import { TranslocoService } from '@ngneat/transloco';
import * as _ from 'lodash';

import { format } from '~/app/functions.helper';

let translocoService: TranslocoService;

export const setTranslationService = (service: TranslocoService) => {
  translocoService = service;
};

/**
 * Translate a string instantly.
 *
 * Note, do not use Transloco's string interpolation feature because it
 * does not interpolate missing keys.
 */
export const translate = (text: string, params: Record<any, any> = {}): string =>
  _.isUndefined(translocoService) ? text : format(translocoService.translate(text), params);

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

export const defaultLanguage = 'en_US';

export const supportedLanguages: Record<string, string> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  en_US: 'English',
  de_DE: 'Deutsch'
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Get the current configured language. If not set in local storage,
 * then try to get the default browser language. Finally, fall back
 * to the specified default language. Defaults to 'en_US'.
 */
export const getCurrentLanguage = (defaultValue = defaultLanguage): string => {
  // Get the stored language from local storage.
  let lang: string | null = localStorage.getItem('language');
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
  // Remove unwanted characters, e.g. `"en_US"` => `en_US`.
  return _.trim(_.defaultTo(lang, defaultValue), '"');
};

export const setCurrentLanguage = (lang: string): void => {
  localStorage.setItem('language', lang);
};
