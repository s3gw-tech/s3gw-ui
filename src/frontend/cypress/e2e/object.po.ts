import { PageHelper } from './page-helper.po';

export class ObjectPageHelper extends PageHelper {
  constructor(private objectName: string) {
    super();
  }

  showDeletedObject(): void {
    cy.get('button.btn.btn-primary[ng-reflect-ngb-tooltip="Show deleted objects"]').click();
  }

  downloadObject(): void {
    super.selectTableElement(this.objectName);
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
}
