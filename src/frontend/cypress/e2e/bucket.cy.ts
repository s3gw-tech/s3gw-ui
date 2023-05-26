describe('Bucket main page', () => {
  beforeEach(() => {
    cy.login();
    cy.navigate('/buckets');
  });

  it('Buckets page view', () => {
    // Assert that we are redirected to the correct page
    cy.url().should('include', '/#/buckets');

    // Create page view
    cy.contains('Create').click();
    cy.contains('Bucket: Create').should('be.visible');
    cy.contains('Versioning').should('be.visible');
    cy.contains('Object Locking').should('be.visible');
    cy.contains('Cancel').should('be.visible');

    // Click the button to create a new bucket with only Versioning enabled
    cy.contains('Enabled').click();
    cy.get('#Name').type('test-bucket');

    // Add tags with key and value
    cy.get('i.ms-2.mdi-18px.s3gw-cursor-pointer').click();
    cy.get('#Key').type('test-key');
    cy.get('#Value').type('test-value');
    cy.get('button:contains("Cancel")').filter(':visible');
    cy.get('button:contains("OK")').filter(':visible').click();

    // select object lock and retention
    cy.contains('Retention').click();
    cy.get('button:contains("Create")').click();
  });
});
