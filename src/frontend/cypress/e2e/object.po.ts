import { PageHelper } from './page-helper.po';

export class ObjectPageHelper extends PageHelper {
  constructor(private objectName: string) {
    super();
  }

  showDeletedObject(): void {
    cy.get('button.btn.btn-primary[ng-reflect-ngb-tooltip="Show deleted objects"]').click();
  }

  downloadObject(): void {
    super.getTableElement(this.objectName);
    cy.get('button.btn-primary i.mdi-download').click();
  }

  uploadObject(): void {
    cy.contains('Upload');
    cy.fixture('example.json').then((fileData) => {
      cy.get('input#file').attachFile({
        fileContent: fileData,
        fileName: 'example.json',
        mimeType: 'application/json'
      });
    });
  }

  deleteAllVersions(name: string, allVersions: boolean = false): void {
    this.getTableElement(name);
    cy.get('s3gw-datatable-actions').contains('button', 'Delete').click({ force: true });
    if (allVersions) {
      cy.get('ngb-modal-window', { timeout: 2000 }).get('[id="deep"]').click();
    }
    cy.get('ngb-modal-window', { timeout: 2000 }).contains('button', 'Yes').click({ force: true });
  }
}
