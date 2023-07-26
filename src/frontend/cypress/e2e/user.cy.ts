import { UserPageHelper } from './user.po';

describe('User Management', () => {
  const userId = 'user123';
  const fullName = 'JohnDoe';
  const email = 'john@example.com';
  const maxBuckets = '10';
  const suspendUser = true;
  const accessKey = 'test_access_key1';
  const secretKey = 'test_secret_key1';
  const userPageHelper = new UserPageHelper(userId);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.enableAdministration();
    cy.navigate('/admin/users');
  });

  afterEach(() => {
    const currentTestTitle = Cypress.mocha.getRunner().suite.ctx.currentTest.title;
    cy.navigate('/admin/users');

    if (currentTestTitle !== 'User page view') {
      //List the user created
      userPageHelper.list(userId);
      // Delete the bucket after each test iteration
      userPageHelper.delete(userId);
    }
  });

  it('User page view', () => {
    // Assert that we are redirected to the correct page
    cy.url().should('include', '/admin/users');
  });

  it('should create a user with default values', () => {
    userPageHelper.createUser(fullName);
    userPageHelper.manageKeys(accessKey, secretKey);
  });

  it('should create a user with custom max bucket mode', () => {
    const maxBucketsMode = 'Custom';
    userPageHelper.createUser('(#J-hn, *_^ D%e. =@+!&)', email, maxBucketsMode, maxBuckets);
  });

  it('should create a user with disabled max bucket mode', () => {
    const maxBucketsMode = 'Disabled';
    userPageHelper.createUser(fullName, email, maxBucketsMode);
    userPageHelper.editUser('new_user', 'new_user@example.com', 'Custom', '1000');
  });

  it('should create a user with unlimited max bucket mode', () => {
    const maxBucketsMode = 'Unlimited';
    userPageHelper.createUser(fullName, email, maxBucketsMode);
  });

  it('should create a user with custom max bucket mode and suspend it', () => {
    const maxBucketsMode = 'Custom';
    userPageHelper.createUser(fullName, email, maxBucketsMode, maxBuckets, suspendUser);
  });
});
