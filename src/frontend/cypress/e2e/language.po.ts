import { PageHelper } from './page-helper.po';

export class LanguagePageHelper extends PageHelper {
  setLanguageBtn(languageToSelect: string) {
    this.getAllLanguages();
    cy.contains('button.dropdown-item', languageToSelect).click();
  }

  getLanguage(languageActive: string) {
    // Assert that the selected language button has the "active" class to indicate it is selected
    cy.contains('button.dropdown-item', languageActive).should('have.class', 'active');
  }

  getAllLanguages() {
    return cy.get('button.dropdown-toggle').click();
  }
}
