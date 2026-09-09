/**
 * Logistics Utility Engine for Print To Frame ERP
 * 
 * Provides helpers for mobile navigation, WhatsApp dispatch generation,
 * fleet vehicle management, and invoice COD balance calculations.
 */

export const FLEET_VEHICLES = [
  { id: 'lorry_ge1234', name: 'Lorry (WP GE 1234)', type: 'Lorry', capacity: '14.5ft Bed' },
  { id: 'van_lh5678', name: 'Van (WP LH 5678)', type: 'Van', capacity: 'High-Roof Cargo' },
  { id: 'bike_xz9012', name: 'Motorbike (WP XZ 9012)', type: 'Motorbike', capacity: 'Document / Sample' },
];

export const DRIVER_DIRECTORY = [
  { name: 'Saman (Master Welder)', phone: '0771234567', role: 'Lead Driver / Fabricator' },
  { name: 'Kamal (Assistant)', phone: '0772345678', role: 'Driver Assistant' },
  { name: 'Sunil (Driver)', phone: '0773456789', role: 'Primary Fleet Driver' },
  { name: 'Nimal (Driver)', phone: '0774567890', role: 'Delivery Associate' },
];

/**
 * Generate a Google Maps turn-by-turn or search navigation URL.
 * @param {string} location Destination address or coordinates
 * @returns {string} Google Maps URL
 */
export function getGoogleMapsUrl(location) {
  if (!location || !location.trim()) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
}

/**
 * Format a phone number for direct tel: or WhatsApp wa.me links.
 * Normalizes Sri Lankan numbers (e.g. 077XXXXXXX -> 9477XXXXXXX).
 * @param {string} phone 
 * @returns {string} Clean digits
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return '94' + digits.slice(1);
  }
  return digits;
}

/**
 * Generate a direct WhatsApp messaging URL.
 * @param {string} phone Recipient phone
 * @param {string} message URL-encoded message text
 * @returns {string} WhatsApp URL
 */
export function getWhatsAppUrl(phone, message) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message || '');
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Format a polite, professional dispatch alert for clients.
 */
export function formatDispatchMessage({
  customerName = '',
  location = '',
  subType = 'Printed Canvas Frame',
  driverName = '',
  driverPhone = '',
  vehiclePlate = '',
  id = '',
  balanceDue = 0
}) {
  const greeting = customerName ? `Hello ${customerName},` : 'Hello,';
  const itemDesc = subType || 'Print To Frame Order';
  const orderRef = id ? ` (${id})` : '';

  let codNotice = 'Payment Status: Fully Settled';
  if (balanceDue > 0) {
    codNotice = `Payment due upon delivery: LKR ${Number(balanceDue).toLocaleString()} (Cash / Bank Transfer)`;
  }

  let driverInfo = '';
  if (driverName) {
    driverInfo = `\nDriver: ${driverName}${driverPhone ? ` (${driverPhone})` : ''}`;
  }
  if (vehiclePlate) {
    driverInfo += `\nVehicle: ${vehiclePlate}`;
  }

  return (
    `${greeting}\n\n` +
    `Your Print To Frame delivery${orderRef} is on the way!\n` +
    `Item: ${itemDesc}\n` +
    `Destination: ${location || 'Client Location'}` +
    `${driverInfo}\n\n` +
    `${codNotice}\n\n` +
    `Our driver will contact you upon arrival. Thank you for choosing Print To Frame!`
  );
}

/**
 * Search and compute outstanding balance from invoices linked to a job or customer.
 * @param {Array} invoices Full list of ERP invoices
 * @param {string} linkedJobNo Associated fabrication or deal jobNo (e.g. PTF-1234)
 * @param {string} customerName Customer or business name
 * @returns {{ hasUnpaid: boolean, totalBalanceDue: number, matchedInvoices: Array }}
 */
export function calculateCODFromInvoices(invoices = [], linkedJobNo = '', customerName = '') {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return { hasUnpaid: false, totalBalanceDue: 0, matchedInvoices: [] };
  }

  const cleanJobNo = String(linkedJobNo || '').trim().toLowerCase();
  const cleanCustName = String(customerName || '').trim().toLowerCase();

  const matched = invoices.filter(inv => {
    const invJobNo = String(inv.linkedJobNo || inv.jobNo || inv.leadId || '').trim().toLowerCase();
    const invCust = String(inv.customerName || inv.company || '').trim().toLowerCase();

    const jobMatch = cleanJobNo && invJobNo && (invJobNo.includes(cleanJobNo) || cleanJobNo.includes(invJobNo));
    const custMatch = cleanCustName && invCust && (invCust.includes(cleanCustName) || cleanCustName.includes(invCust));

    return jobMatch || custMatch;
  });

  const unpaidInvoices = matched.filter(inv => {
    const status = String(inv.status || 'Unpaid').toLowerCase();
    return status !== 'paid' && status !== 'cancelled' && status !== 'void';
  });

  const totalBalanceDue = unpaidInvoices.reduce((sum, inv) => {
    const val = Number(inv.amount || inv.totalValue || 0);
    return sum + val;
  }, 0);

  return {
    hasUnpaid: totalBalanceDue > 0,
    totalBalanceDue,
    matchedInvoices: matched
  };
}
