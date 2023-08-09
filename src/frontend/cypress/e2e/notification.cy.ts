import { BucketPageHelper } from './bucket.po';
import { NotificationHelper } from './notification.po';
import { ObjectPageHelper } from './object.po';

describe('Notification tests', () => {
  const bucketName = 'e2ebucket';
  const addTag = true;
  const objectName = 'example.json';
  const enableVersioning = true;
  const notificationHelper = new NotificationHelper();
  const bucketPageHelper = new BucketPageHelper(bucketName);
  const objectPageHelper = new ObjectPageHelper(objectName);

  beforeEach(() => {
    localStorage.setItem('language', 'en_US');
    cy.login();
    cy.navigate('/buckets');
  });

  it('Notification test on bucket', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning);
    bucketPageHelper.delete(bucketName);
    notificationHelper.listNotification();
    notificationHelper.validateNotification(`Bucket ${bucketName} has been deleted.`);
    notificationHelper.deleteNotification();
  });

  it('Notification test on object', () => {
    bucketPageHelper.createBucket(addTag, enableVersioning);
    bucketPageHelper.exploreBucket();
    objectPageHelper.uploadObject();
    objectPageHelper.delete(objectName);
    notificationHelper.listNotification();
    notificationHelper.validateNotification('1 object(s) have been successfully uploaded.');
    notificationHelper.validateNotification(`The object ${objectName} has been deleted.`);
    notificationHelper.deleteNotification();
  });
});
