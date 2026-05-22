import { Page } from '@playwright/test';

export class DisputeDetailDrawer {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Drawer scope (all locators scoped to avoid matching page elements)
  private drawerScope = '//div[@class="ant-drawer-body"]';

  // Drawer title
  readonly drawerTitle = '//div[@class="ant-drawer-title"]';

  // Contextual alert message text
  readonly contextualAlert = `${this.drawerScope}//div[@class="ant-alert-message"]//div[@class='ant-space-item'][1]`;

  // Specific messages for each dispute status
  readonly disputeMessagesByStatus: Record<string, string> = {
    to_be_completed: 'Vous pouvez compléter votre déclaration de litige.En cas de question, rapprochez-vous de notre service comptabilité.',
    in_progress: 'Votre demande est en cours d’analyse par nos équipes.',
    invalid_documents: 'L’un des documents que vous avez renseigné n’est pas conforme. Un email explicatif vous a été envoyé à ${contact_email}. En cas de question, rapprochez-vous de notre service comptabilité.',
    cancelled: 'Ce litige a été annulé à votre demande.',
    rejected: 'Votre demande a été refusée.Un email explicatif vous a été envoyé à ${contact_email}. En cas de question, rapprochez-vous de notre service comptabilité.',
    approved: 'Votre demande a été validée.Le geste commercial sera effectué sous 3 semaines à compter de la date de validation.',
  };

  // Contextual alert button
  contextualAlertButton() {
    return this.page.locator(`${this.drawerScope}//div[@class="ant-alert-message"]//button`);
  };

  // Helper to build a field value locator (label → next sibling div)
  private fieldValue(label: string): string {
    return `${this.drawerScope}//div[normalize-space()="${label}"]/following-sibling::div`;
  }

  // Status label
  get statusLabel() { return this.fieldValue('Statut de traitement'); }

  // Date fields
  get creationDate() { return this.fieldValue('Date de création'); }
  get completionDeadline() { return this.fieldValue('Date limite de complétion'); }
  get validationDate() { return this.fieldValue('Date de validation'); }

  // Store and delivery info
  get storeName() { return this.fieldValue('Magasin'); }
  get deliveryReference() { return this.fieldValue('Référence de la livraison'); }
  get recipientName() { return this.fieldValue('Destinataire'); }
  get recipientPhone() { return this.fieldValue('Numéro de téléphone'); }

  // Reason and amount
  get disputeReason() { return this.fieldValue('Raison du litige'); }
  get disputeAmount() { return this.fieldValue('Montant'); }

  // "Voir le détail de la livraison" button
  readonly deliveryDetailButton = `${this.drawerScope}//button/a[text()='Voir le détail de la livraison']`;
}
