import { PageHelper } from './page-helper.po';

export class UserPageHelper extends PageHelper {
  constructor(private userId: string) {
    super();
  }

  createUser(
    fullName: string,
    email?: string,
    maxBucketsMode?: string,
    maxBuckets?: string,
    suspendUser?: boolean,
    adminUser?: boolean
  ): void {
    cy.clickButton('Create');
    cy.get('#user_id').type(this.userId);
    cy.get('#display_name').type(fullName);

    if (email) {
      cy.get('#email').type(email);
    }

    // Select bucket mode
    cy.get('select[id="max_buckets_mode"]').select(maxBucketsMode || 'Custom');

    if (maxBucketsMode === 'Custom') {
      cy.get('input#max_buckets')
        .clear()
        .type(maxBuckets || '100');
    }

    if (suspendUser) {
      cy.get('#suspended').check();
    }

    if (adminUser) {
      cy.get('#admin').click();
    }

    cy.clickButton('Create');
  }

  editUser(
    fullName: string,
    email?: string,
    maxBucketsMode?: string,
    maxBuckets?: string,
    suspendUser?: boolean,
    adminUser?: boolean
  ): void {
    cy.contains('table tbody tr', this.userId).within(() => {
      super.selectActionsButton();
      cy.clickButton('Edit');
    });

    cy.get('#display_name').clear().type(fullName);

    if (email) {
      cy.get('#email').clear().type(email);
    }

    // Select bucket mode
    cy.get('select[id="max_buckets_mode"]').select(maxBucketsMode || 'Custom');

    if (maxBucketsMode === 'Custom') {
      cy.get('input#max_buckets')
        .clear()
        .type(maxBuckets || '100');
    }

    if (suspendUser) {
      cy.get('#suspended').check();
    }

    if (adminUser) {
      cy.get('#admin').click();
    }

    cy.clickButton('Update');
  }

  manageKeys(accessKey: string, secretKey: string, autogenerate: boolean = true): void {
    cy.contains('table tbody tr', this.userId).within(() => {
      super.selectActionsButton();
      cy.clickButton('Manage Keys');
    });
    cy.clickButton('Create');

    if (!autogenerate) {
      cy.get('label[for="generate_key"]').click();
      cy.get('input#access_key').clear().type(accessKey);
      cy.get('input#secret_key').clear().type(secretKey);
    }
    cy.clickButton('Create');
  }
}
