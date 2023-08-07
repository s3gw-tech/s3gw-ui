import { PageHelper } from './page-helper.po';

export class NotificationHelper extends PageHelper {
  listNotification(): void {
    cy.get('button[title="Notifications"]', { timeout: 2000 }).click();
  }

  deleteNotification(): void {
    cy.get('button[title="Dismiss all"]', { timeout: 2000 }).click();
  }

  validateNotification(notificationToValidate: string): void {
    cy.get('s3gw-notification-bar').should('contain', notificationToValidate);
  }
}
