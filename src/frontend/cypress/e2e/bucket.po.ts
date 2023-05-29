export class BucketPageHelper {
  private key = 'test-key';
  private value = 'test-value';

  constructor(private bucketName: string) {}

  createBucket(
    addTag?: boolean,
    versioning?: boolean,
    objectLocking?: boolean,
    retentionMode?: string
  ): void {
    cy.contains('Create').click();
    cy.get('#Name').type(this.bucketName);

    //Add tag with key and value
    if (addTag) {
      cy.get('i.ms-2.mdi-18px.s3gw-cursor-pointer').click();
      cy.get('#Key').type(this.key);
      cy.get('#Value').type(this.value);
      cy.get('button:contains("Cancel")').filter(':visible');
      cy.get('button:contains("OK")').filter(':visible').click();
    }

    //Enabling bucket versioning
    if (versioning) {
      cy.get('[id="VersioningEnabled"]').click();

      //Enabling object locking
      if (objectLocking) {
        cy.get('[id="ObjectLockEnabled"]').click();
      }

      //Enabling rentention mode
      if (retentionMode === 'Compliance' || retentionMode === 'Governance') {
        cy.get('[id="RetentionEnabled"]').click();
        cy.get('select[id="RetentionMode"]').select(retentionMode);
      }
    }
    cy.get('button:contains("Create")').click();
  }

  listBucket(): void {
    cy.contains(this.bucketName);
  }

  deleteBucket(): void {
    cy.contains(this.bucketName).click();
    cy.contains('Delete').click();
    cy.contains('Yes').click();
  }
}
