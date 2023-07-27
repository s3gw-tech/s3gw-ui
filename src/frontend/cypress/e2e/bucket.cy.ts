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
  const bucketPageHelper = new BucketPageHelper(bucketName);
  const objectPageHelper = new ObjectPageHelper(objectName);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.navigate('/buckets');
  });

  afterEach(() => {
    const currentTestTitle = Cypress.mocha.getRunner().suite.ctx.currentTest.title;

    if (currentTestTitle !== 'Buckets page view') {
      // Note, some tests do not clean up their objects in
      // the buckets they have created. It is not possible
      // to delete buckets with objects via the AWS S3 API,
      // but the Admin Ops API allows that.
      cy.enableAdministration();
      cy.navigate('/admin/buckets');
      bucketPageHelper.list(bucketName);
      bucketPageHelper.deleteEx(bucketName, true);
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
    bucketPageHelper.createBucket();

    //edit bucket to enable versioning
    bucketPageHelper.editBucket(addTag, enableVersioning);

    // Explore bucket operations
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    objectPageHelper.downloadObject();
    objectPageHelper.reload();

    // Search object using search bar and clear the search
    objectPageHelper.search(objectName);
    objectPageHelper.clearSearch();

    //delete and show deleted object in the bucket
    objectPageHelper.deleteEx(objectName);
    objectPageHelper.showDeletedObject();

    //check if object is listed after delete
    objectPageHelper.list(objectName);
    objectPageHelper.displayColumns();

    // Upload a new version of the object to be able to delete
    // all versions which is necessary to be able to delete the
    // bucket in the `afterEach` hook.
    objectPageHelper.uploadObject();
    objectPageHelper.deleteEx(objectName, true);
  });

  it('should manage life cycle', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning, enableObjectLock);
    bucketPageHelper.createLifecycleRule(ruleId);
    bucketPageHelper.modifyLifecycleRule(ruleId);
    bucketPageHelper.deleteLifecycleRule(ruleId);
  });

  it('manage versioned bucket', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning);
    bucketPageHelper.exploreBucket();

    //upload a object to folder created in a bucket
    bucketPageHelper.folderCreate(folderName);
    objectPageHelper.uploadObject();
    objectPageHelper.list(objectName);
  });

  it('manage test versioned bucket with object locking', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning, enableObjectLock);
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    objectPageHelper.downloadObject();
    objectPageHelper.reload();
    objectPageHelper.deleteEx(objectName, true);
  });

  it.skip('manage versioned bucket with object locking and Compliance retention mode', () => {
    const retentionMode = 'Compliance';
    bucketPageHelper.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    objectPageHelper.downloadObject();
    objectPageHelper.reload();
    objectPageHelper.deleteEx(objectName);
    cy.contains('Forbidden by object lock.');
  });

  it.skip('versioned bucket with object locking and Governance retention mode', () => {
    const retentionMode = 'Governance';
    bucketPageHelper.createBucket(addTag, enableVersioning, enableObjectLock, retentionMode);
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    objectPageHelper.downloadObject();
    objectPageHelper.reload();
    objectPageHelper.deleteEx(objectName);
    cy.contains('Forbidden by object lock.');
  });

  it('bucket test for show/hide button', () => {
    bucketPageHelper.createBucket();
    bucketPageHelper.displayColumns();
    bucketPageHelper.reload();
    bucketPageHelper.getDataTableHead('Name');
    bucketPageHelper.getDataTableHead('Created');
    bucketPageHelper.setPageSize(100);
  });

  it('Object test for show/hide button', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning, enableObjectLock);
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    objectPageHelper.displayColumns();
    objectPageHelper.setDataTableHead('Key');
    objectPageHelper.setDataTableHead('Status');
    objectPageHelper.reload();

    //Validate if the columns selected using show/hide button are visible
    objectPageHelper.getDataTableHead('Name').should('exist');
    objectPageHelper.getDataTableHead('Key').should('exist');
    objectPageHelper.getDataTableHead('Size').should('exist');
    objectPageHelper.getDataTableHead('Last Modified').should('exist');
    objectPageHelper.getDataTableHead('Status').should('exist');
  });

  it('Object validate', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning, enableObjectLock);
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    bucketPageHelper.reload();
    objectPageHelper.expand(objectName);
    objectPageHelper.collapse(objectName);
    objectPageHelper.setPageSize(25);
  });
});
