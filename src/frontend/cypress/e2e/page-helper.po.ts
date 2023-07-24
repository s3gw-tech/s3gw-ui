export class PageHelper {
  displayColumns(): void {
    cy.get(
      'button.dropdown-toggle.btn.btn-simple[ngbdropdowntoggle][ng-reflect-ngb-tooltip="Show/Hide columns"]'
    ).click();
  }

  reload(): void {
    cy.get('button.reload').click();
  }

  search(textToSearch: string): void {
    cy.get('input[type="search"]').type(textToSearch).type('{enter}');
  }

  clearSearch(): void {
    cy.get('button.btn.btn-input-group[ng-reflect-ngb-tooltip="Clear"]').click();
  }

  delete(name: string): void {
    this.getTableElement(name);
    cy.get('s3gw-datatable-actions').contains('button', 'Delete').click({ force: true });
    cy.get('ngb-modal-window', { timeout: 2000 }).contains('button', 'Yes').click({ force: true });
  }

  list(name: string): void {
    cy.get('table').contains('td', name);
  }

  selectActionsButton(): void {
    cy.get('button.btn.actions')
      .should('be.visible')
      .should('have.attr', 'title', 'Actions')
      .click();
  }

  getTableElement(elementName: string): void {
    cy.get('table').contains('td', elementName).click();
  }

  setDataTableHead(columnName: string) {
    return cy.get('span').contains(columnName).click();
  }

  getDataTableHead(columnName: string) {
    return cy.get('table thead').contains('th', columnName);
  }

  collapse(objectName: string) {
    cy.contains('table tbody tr', objectName).within(() => {
      cy.get('button[title="Collapse"]', { timeout: 2000 }).should('be.visible').click();
    });
  }

  expand(objectName: string) {
    cy.contains('table tbody tr', objectName).within(() => {
      cy.get('button[title="Expand"]', { timeout: 2000 }).should('be.visible').click();
    });
  }

  setPageSize(itemsPerPage: number) {
    cy.get('button.dropdown-toggle.btn.btn-outline-default').click();
    cy.get('div.dropdown-menu')
      .contains('button.dropdown-item', `${itemsPerPage} items per page`)
      .click();
  }
}
