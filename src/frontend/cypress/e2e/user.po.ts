export class UserPageHelper {
  constructor(private userId: string) {}

  createUser(
    fullName: string,
    email?: string,
    maxBucketsMode?: string,
    maxBuckets?: string,
    suspendUser?: boolean
  ): void {
    cy.contains('Create').click();
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
    cy.get('button:contains("Create")').click();
  }

  listUser(): void {
    cy.contains(this.userId);
  }

  deleteUser(): void {
    cy.contains(this.userId).click();
    cy.contains('Delete').click();
    cy.contains('Yes').click();
  }
}
