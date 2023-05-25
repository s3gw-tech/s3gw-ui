describe('Dashboard main page', () => {
  beforeEach(() => {
    cy.login();
    cy.navigate('/dashboard');
  });

  it('Dashboard with test user', () => {
    cy.contains('Total buckets').should('be.visible').click();
    cy.url().should('include', '/#/buckets');
  });

  it('Dashboard with adminstration enabled', () => {
    // Assert that we are redirected to the correct page
    cy.url().should('include', '/dashboard');

    // Administration enabled
    cy.enableAdministration();
    cy.contains('Total users').should('be.visible').click();
    cy.url().should('include', '/#/admin/users');

    cy.navigate('/admin/dashboard');
    cy.contains('Total buckets').should('be.visible').click();
    cy.url().should('include', '/#/admin/buckets');
  });
});
