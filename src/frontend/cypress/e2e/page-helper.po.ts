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

  delete(): void {
    cy.clickButton('Delete');
    }
}
