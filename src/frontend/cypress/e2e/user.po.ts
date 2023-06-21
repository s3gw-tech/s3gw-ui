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
    suspendUser?: boolean
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
    cy.clickButton('Create');
  }
}
