// ***********************************************
// This example namespace declaration will help
// with Intellisense and code completion in your
// IDE or Text Editor.
// ***********************************************
// declare namespace Cypress {
//   interface Chainable<Subject = any> {
//     customCommand(param: any): typeof customCommand;
//   }
// }
//
// function customCommand(param: any): void {
//   console.warn(param);
// }
//
// NOTE: You can use it like so:
// Cypress.Commands.add('customCommand', customCommand);
//
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  interface Chainable<Subject = any> {
    navigate(url: string): Chainable<Subject>;
    clickButton(label: string): Chainable<Subject>;
    login(): void;
    logout(): void;
    enableAdministration(): void;
  }
}

Cypress.Commands.add('navigate', (url: string) => {
  return cy.wait(1000).visit(`/#${url}`);
});

Cypress.Commands.add('login', () => {
  cy.visit('/');
  const accessKey = Cypress.env('accessKey');
  const secretKey = Cypress.env('secretKey');
  cy.get('#accessKey').type(accessKey);
  cy.get('#secretKey').type(secretKey);
  cy.contains('Log in').click();
});

Cypress.Commands.add('logout', () => {
  cy.visit('/');
  cy.get('button.btn.btn-simple.mx-2[ngbDropdownToggle]').click();
  cy.contains('Log out').should('be.visible').click();
  cy.contains('Yes').should('be.visible').click();
});

Cypress.Commands.add('enableAdministration', () => {
  cy.get('.form-check-input').click();
});

// Press the first found button with the given text.
Cypress.Commands.add('clickButton', (text: string) => {
  return cy.get(`button:contains("${text}")`).should('be.visible').click();
});
