import { BucketPageHelper } from './bucket.po';
import { ObjectPageHelper } from './object.po';

describe('Bucket Management', () => {
  const bucketName = 'e2ebucket';
  const addTag = true;
  const enableVersioning = true;
  const enableObjectLock = true;
  const objectName = 'example.json';
  const folderName = 'test-folder';
  const ruleId = 'rule01';
  const bucket = new BucketPageHelper(bucketName);
  const object = new ObjectPageHelper(objectName);

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
    object.uploadObject();
    object.downloadObject();
    object.reload();

    // Search object using search bar and clear the search
    object.search(objectName);
    object.clearSearch();

    //delete and show deleted object in the bucket
    object.delete(objectName);
    object.showDeletedObject();

    //check if object is listed after delete
    object.list(objectName);
    object.displayColumns();
  });

  it('manage versioned bucket', () => {
    bucket.createBucket(addTag, enableVersioning);
    bucket.lifecycleRuleCreate(ruleId);
    cy.navigate('/buckets');
    bucket.exploreBucket();

    //upload a object to folder created in a bucket
    bucket.folderCreate(folderName);
    object.uploadObject();
    object.list(objectName);
  });

  it('manage test versioned bucket with object locking', () => {
    bucket.createBucket(addTag, enableVersioning, enableObjectLock);
    bucket.lifecycleRuleCreate(ruleId);
    bucket.lifecycleRuleModify(ruleId);
    bucket.delete(ruleId);

    cy.navigate('/buckets');
    bucket.exploreBucket();
    object.uploadObject();
    object.downloadObject();
    object.reload();
    object.delete(objectName);
  });

  it.skip('manage versioned bucket with object locking and Compliance retention mode', () => {
    const retentionMode = 'Compliance';
    bucket.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
    bucket.exploreBucket();
    object.uploadObject();
    object.downloadObject();
    object.reload();
    object.delete(objectName);
    cy.contains('Forbidden by object lock.');
  });

  it.skip('versioned bucket with object locking and Governance retention mode', () => {
    const retentionMode = 'Governance';
    bucket.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
    bucket.exploreBucket();
    object.uploadObject();
    object.downloadObject();
    object.reload();
    object.delete(objectName);
    cy.contains('Forbidden by object lock.');
  });
});
