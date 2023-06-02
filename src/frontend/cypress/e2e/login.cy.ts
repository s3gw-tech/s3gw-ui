describe('Login page s3gw-ui', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
  });

  it('Login page view', () => {
    // Visit to s3gw page
    cy.visit('/');

    // Welcome page
    cy.contains('Howdy!').should('be.visible');
    cy.contains('Welcome to s3gw').should('be.visible');
    cy.login();
  });
});
