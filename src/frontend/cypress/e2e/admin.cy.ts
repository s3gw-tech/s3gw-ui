import { BucketPageHelper } from './bucket.po';

describe('Operations with adminstration enabled', () => {
  const bucketName = 'bucket';
  const addTag = true;
  const enableVersioning = true;
  const enableObjectLock = true;
  const bucket = new BucketPageHelper(bucketName);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.enableAdministration();
    cy.get('input#viewMode').should('be.checked');
  });

  it('Bucket operations', () => {
    // Assert that we are redirected to the correct page
    cy.navigate('/admin/buckets');
    bucket.createBucket(addTag, enableVersioning, enableObjectLock);
    //test disabled due to https://github.com/aquarist-labs/s3gw/issues/603
    //bucket.delete(bucketName);
    bucket.reload();
  });
});
