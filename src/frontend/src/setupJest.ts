/**
 * @angular/localize, especially `$localize`, is needed by ng-bootstrap.
 * https://ng-bootstrap.github.io/#/guides/i18n
 */
import '@angular/localize/init';

import { jest } from '@jest/globals';

Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => ''
  })
});

// @ts-ignore
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));
