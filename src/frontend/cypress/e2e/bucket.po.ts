import { PageHelper } from './page-helper.po'

export class BucketPageHelper extends PageHelper  {
  private key = 'test-key';
  private value = 'test-value';

  constructor(private bucketName: string) {
    super();
  }

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
      this.addTag();
    }
    //Enabling bucket versioning
    if (versioning) {
      this.versioning();
      //Enabling object locking
      if (objectLocking) {
        this.objectLock();
      }
      //Enabling rentention mode
      if (retentionMode === 'Compliance' || retentionMode === 'Governance') {
        this.retentionMode(retentionMode);
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

  editBucket(addTag?: boolean, versioning?: boolean): void {
    cy.get('button.btn.actions')
      .should('be.visible')
      .should('have.attr', 'title', 'Actions')
      .click();

    cy.get('button:contains("Edit")').click();

    //Add tag with key and value
    if (addTag) {
      this.addTag();
    }
    //Enabling bucket versioning
    if (versioning) {
      this.versioning();
    }
    cy.get('button:contains("Cancel")').filter(':visible');
    cy.get('button:contains("Update")').click();
  }

  objectLock(): void {
    cy.get('[id="ObjectLockEnabled"]').click();
  }

  retentionMode(retentionMode: string): void {
    cy.get('[id="RetentionEnabled"]').click();
    cy.get('select[id="RetentionMode"]').select(retentionMode);
  }

  versioning(): void {
    cy.get('[id="VersioningEnabled"]').click();
  }

  addTag(): void {
    cy.get('i.ms-2.mdi-18px.s3gw-cursor-pointer').click();
    cy.get('#Key').type(this.key);
    cy.get('#Value').type(this.value);
    cy.get('button:contains("Cancel")').filter(':visible');
    cy.get('button:contains("OK")').filter(':visible').click();
  }

  showDeletedObject(): void {
    cy.get('button.btn.btn-primary[ng-reflect-ngb-tooltip="Show deleted objects"]')
    .click();
  }

  folderCreate(folderName: string): void {
    cy.clickButton('Folder');
    cy.get('input#path').type(folderName);
    cy.clickButton('Create');
  }

}
