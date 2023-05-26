describe('Topbar', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Administration button', () => {
    cy.contains('Administration').should('be.visible');

    //Click on Adminstration button
    cy.enableAdministration();
  });

  it('Notification button', () => {
    //Click on notification toggle button
    cy.get('button[title="Notifications"]').click();
  });

  it('Help button', () => {
    //Click on Help button
    cy.get('button[title="Help"]').click();

    //Github actions
    cy.contains('GitHub').should('be.visible').click();
    cy.get(
      'div[ngbDropdownMenu] a[href="https://github.com/aquarist-labs/s3gw"][target="_blank"]'
    ).should('have.attr', 'href', 'https://github.com/aquarist-labs/s3gw');

    //Website actions
    cy.get('button[title="Help"]').click();
    cy.contains('Website').should('be.visible').click();
    cy.get('div[ngbDropdown]')
      .find('a[href="https://s3gw.io/"][target="_blank"]')
      .should('have.text', 'Website')
      .should('have.attr', 'href', 'https://s3gw.io/');
  });

  it('Profile button', () => {
    cy.get('button.btn.btn-simple.mx-2[ngbDropdownToggle]').click();
    cy.contains('Log out').should('be.visible');
    cy.logout();
  });
});
