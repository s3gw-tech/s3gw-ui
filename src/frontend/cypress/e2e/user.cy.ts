import { UserPageHelper } from './user.po';

describe('User Management', () => {
  const userId = 'user123';
  const fullName = 'JohnDoe';
  const email = 'john@example.com';
  const maxBuckets = '10';
  const suspendUser = true;
  const users = new UserPageHelper(userId);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.enableAdministration();
    cy.navigate('/admin/users');
  });

  afterEach(() => {
    const currentTestTitle = Cypress.mocha.getRunner().suite.ctx.currentTest.title;

    if (currentTestTitle !== 'User page view') {
      //List the user created
      users.listUser();
      // Delete the bucket after each test iteration
      users.deleteUser();
    }
  });

  it('User page view', () => {
    // Assert that we are redirected to the correct page
    cy.url().should('include', '/admin/users');
  });

  it('should create a user with default values', () => {
    const maxBucketsMode = 'Custom';
    users.createUser(fullName);
  });

  it('should create a user with custom max bucket mode', () => {
    const maxBucketsMode = 'Custom';
    users.createUser(fullName, email, maxBucketsMode, maxBuckets);
  });

  it('should create a user with disabled max bucket mode', () => {
    const maxBucketsMode = 'Disabled';
    users.createUser(fullName, email, maxBucketsMode);
  });

  it('should create a user with unlimited max bucket mode', () => {
    const maxBucketsMode = 'Unlimited';
    users.createUser(fullName, email, maxBucketsMode);
  });

  it('should create a user with custom max bucket mode and suspend it', () => {
    const maxBucketsMode = 'Custom';
    users.createUser(fullName, email, maxBucketsMode, maxBuckets, suspendUser);
  });
});
