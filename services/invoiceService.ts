
import { User, Invoice } from '../types';

export const invoiceService = {
  generateInvoiceBlob: (invoice: Invoice, user: User | null): void => {
    const userName = user?.name || 'Client';
    const userEmail = user?.email || 'email@example.com';
    const issueDate = new Date().toLocaleDateString('fr-FR');
    
    // HTML Template for Professional Invoice
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture #${invoice.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #8A2DF9; }
          .invoice-details { text-align: right; }
          .client-info { margin-bottom: 40px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .table th { background: #f9f9f9; padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #ddd; }
          .table td { padding: 12px; border-bottom: 1px solid #eee; }
          .total-section { display: flex; justify-content: flex-end; }
          .total-table { width: 300px; }
          .total-table td { padding: 8px; }
          .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; }
          .footer { margin-top: 60px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Événéo</div>
          <div class="invoice-details">
            <h1>FACTURE</h1>
            <p>Numéro: <strong>${invoice.id}</strong></p>
            <p>Date: ${invoice.date}</p>
            <p>Statut: <span style="color: green; font-weight: bold;">PAYÉE</span></p>
          </div>
        </div>

        <div class="client-info">
          <h3>Facturé à :</h3>
          <p>${userName}</p>
          <p>${userEmail}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantité</th>
              <th style="text-align: right;">Prix Unitaire</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Service de mise en relation / Prestation Événementielle</td>
              <td>1</td>
              <td style="text-align: right;">${(invoice.amount / 1.2).toFixed(2)} €</td>
              <td style="text-align: right;">${(invoice.amount / 1.2).toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <table class="total-table">
            <tr>
              <td>Total HT</td>
              <td style="text-align: right;">${(invoice.amount / 1.2).toFixed(2)} €</td>
            </tr>
            <tr>
              <td>TVA (20%)</td>
              <td style="text-align: right;">${(invoice.amount - (invoice.amount / 1.2)).toFixed(2)} €</td>
            </tr>
            <tr class="grand-total">
              <td>Total TTC</td>
              <td style="text-align: right;">${invoice.amount.toFixed(2)} €</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Événéo SAS - 12 Avenue des Champs-Élysées, 75008 Paris - SIRET 123 456 789 00012</p>
          <p>Merci de votre confiance.</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    // Open new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } else {
        alert("Veuillez autoriser les pop-ups pour télécharger la facture.");
    }
  }
};
