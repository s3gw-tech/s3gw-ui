import { BucketPageHelper } from './bucket.po';

describe('Bucket Management', () => {
  const bucketName = 'e2ebucket';
  const addTag = true;
  const enableVersioning = true;
  const enableObjectLock = true;
  const objectName = 'example.json';
  const folderName = 'test-folder';
  const bucket = new BucketPageHelper(bucketName);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.navigate('/buckets');
  });

  afterEach(() => {
    const currentTestTitle = Cypress.mocha.getRunner().suite.ctx.currentTest.title;

    if (currentTestTitle !== 'Buckets page view') {
      cy.navigate('/buckets');
      // List the bucket created
      bucket.list(bucketName);
      // Delete the bucket after each test iteration
      bucket.delete(bucketName);
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

    //edit bucket to enable versioning
    bucket.editBucket(addTag, enableVersioning);

    // Explore bucket operations
    bucket.exploreBucket();
    bucket.uploadObject(objectName);
    bucket.downloadObject(objectName);
    bucket.reload();

    // Search object using search bar and clear the search
    bucket.search(objectName);
    bucket.clearSearch();

    //delete and show deleted object in the bucket
    bucket.delete(objectName);
    bucket.showDeletedObject();

    //check if object is listed after delete
    bucket.list(objectName);
    bucket.displayColumns();
  });

  it('manage versioned bucket', () => {
    bucket.createBucket(addTag, enableVersioning);
    bucket.exploreBucket();

    //upload a object to folder created in a bucket
    bucket.folderCreate(folderName);
    bucket.uploadObject(objectName);
    bucket.list(objectName);
  });

  it('manage test versioned bucket with object locking', () => {
    bucket.createBucket(addTag, enableVersioning, enableObjectLock);
    bucket.exploreBucket();
    bucket.uploadObject(objectName);
    bucket.downloadObject(objectName);
    bucket.reload();
    bucket.delete(objectName);
  });

  it.skip('manage versioned bucket with object locking and Compliance retention mode', () => {
    const retentionMode = 'Compliance';
    bucket.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
    bucket.exploreBucket();
    bucket.uploadObject(objectName);
    bucket.downloadObject(objectName);
    bucket.reload();
    bucket.delete(objectName);
    cy.contains('Forbidden by object lock.');
  });

  it.skip('versioned bucket with object locking and Governance retention mode', () => {
    const retentionMode = 'Governance';
    bucket.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
    bucket.exploreBucket();
    bucket.uploadObject(objectName);
    bucket.downloadObject(objectName);
    bucket.reload();
    bucket.delete(objectName);
    cy.contains('Forbidden by object lock.');
  });
});
