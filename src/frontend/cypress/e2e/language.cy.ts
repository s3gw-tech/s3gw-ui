import { LanguagePageHelper } from './language.po';

describe('Test languages', () => {
  const language = new LanguagePageHelper();

  beforeEach(() => {
    cy.visit('/');
  });

  it('should check default language', () => {
    language.setLanguageBtn('English');
    language.getLanguage('English');
  });

  it('Change default language', () => {
    language.setLanguageBtn('Deutsch');
    language.getLanguage('Deutsch');
  });

  it('should check all available languages', () => {
    language.getAllLanguages();
    cy.contains('English').should('be.visible');
    cy.contains('Deutsch').should('be.visible');
  });
});
