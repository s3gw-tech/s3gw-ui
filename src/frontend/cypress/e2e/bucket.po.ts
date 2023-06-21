import 'cypress-file-upload';

import { PageHelper } from './page-helper.po';

export class BucketPageHelper extends PageHelper {
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
    cy.clickButton('Create');
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
    cy.clickButton('Create');
  }

  editBucket(addTag?: boolean, versioning?: boolean): void {
    cy.contains('table tbody tr', this.bucketName).within(() => {
      super.selectActionsButton();
      cy.clickButton('Edit');
    });

    //Add tag with key and value
    if (addTag) {
      this.addTag();
    }
    //Enabling bucket versioning
    if (versioning) {
      this.versioning();
    }
    cy.get('button:contains("Cancel")').filter(':visible');
    cy.clickButton('Update');
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
    cy.clickButton('OK');
  }

  showDeletedObject(): void {
    cy.get('button.btn.btn-primary[ng-reflect-ngb-tooltip="Show deleted objects"]').click();
  }

  exploreBucket(): void {
    cy.contains('table tbody tr', this.bucketName).within(() => {
      cy.contains('Explore').click();
    });
  }

  folderCreate(folderName: string): void {
    cy.clickButton('Folder');
    cy.get('input#path').type(folderName);
    cy.clickButton('Create');
  }

  downloadObject(objectName: string): void {
    super.selectTableElement(objectName);
    cy.get('button.btn-primary i.mdi-download').click();
  }

  uploadObject(objectName: string): void {
    cy.contains('Upload');
    cy.fixture('example.json').then((fileData) => {
      cy.get('input#file').attachFile({
        fileContent: fileData,
        fileName: 'example.json',
        mimeType: 'application/json'
      });
    });
  }
}
