import { BucketPageHelper } from './bucket.po';

describe('Bucket Management', () => {
  const bucketName = 'e2ebucket';
  const addTag = true;
  const enableVersioning = true;
  const enableObjectLock = true;
  const bucket = new BucketPageHelper(bucketName);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.navigate('/buckets');
  });

  afterEach(() => {
    const currentTestTitle = Cypress.mocha.getRunner().suite.ctx.currentTest.title;

    if (currentTestTitle !== 'Buckets page view') {
      // List the bucket created
      bucket.listBucket();
      // Delete the bucket after each test iteration
      bucket.deleteBucket();
    }
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
  });

  it('should create a new bucket', () => {
    bucket.createBucket();
    bucket.editBucket(addTag, enableVersioning);
  });

  it('manage versioned bucket', () => {
    bucket.createBucket(addTag, enableVersioning);
  });

  it('manage test versioned bucket with object locking', () => {
    bucket.createBucket(addTag, enableVersioning, enableObjectLock);
  });

  it('manage versioned bucket with object locking and Compliance retention mode', () => {
    const retentionMode = 'Compliance';
    bucket.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
  });

  it('versioned bucket with object locking and Governance retention mode', () => {
    const retentionMode = 'Governance';
    bucket.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
  });
});
