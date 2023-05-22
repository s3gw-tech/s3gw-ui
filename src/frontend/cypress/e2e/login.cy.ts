describe('Login s3gw-ui', () => {
  beforeEach(() => {
    // Login to s3gw page
    cy.visit('/');

    // Welcome page
    cy.contains('Howdy!').should('be.visible');
    cy.contains('Welcome to s3gw').should('be.visible');

    const accessKey = Cypress.env('accessKey');
    const secretKey = Cypress.env('secretKey');

    cy.get('#accessKey').type(accessKey);
    cy.get('#secretKey').type(secretKey);
    cy.contains('Log in').click();
  });

  it('Check top bar and dashboard', () => {
    // Top bar
    cy.contains('s3gw').should('be.visible');
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Buckets').should('be.visible');

    // Visit dashboard page
    cy.navigate('/dashboard');

    // Assert that we are redirected to the correct page
    cy.url().should('include', '/dashboard');
  });

  it('Buckets page view', () => {
    // buckets
    cy.navigate('/buckets');

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
    cy.get('button:contains("Create")').filter(':visible').click();
  });
});
