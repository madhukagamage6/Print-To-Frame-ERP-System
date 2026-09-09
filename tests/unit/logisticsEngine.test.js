import { describe, it, expect } from 'vitest';
import { 
  getGoogleMapsUrl, 
  cleanPhoneNumber, 
  getWhatsAppUrl, 
  formatDispatchMessage,
  calculateCODFromInvoices,
  FLEET_VEHICLES,
  DRIVER_DIRECTORY
} from '../../src/utils/logisticsEngine';

describe('logisticsEngine', () => {
  it('generates proper Google Maps navigation URLs', () => {
    expect(getGoogleMapsUrl('')).toBe('');
    expect(getGoogleMapsUrl('Colombo 07')).toBe('https://www.google.com/maps/search/?api=1&query=Colombo%2007');
    expect(getGoogleMapsUrl('Kadawatha Hub, Kandy Road')).toContain('Kadawatha%20Hub');
  });

  it('cleans and normalizes Sri Lankan phone numbers for WhatsApp', () => {
    expect(cleanPhoneNumber('0771234567')).toBe('94771234567');
    expect(cleanPhoneNumber('+94 77 123 4567')).toBe('94771234567');
    expect(cleanPhoneNumber('')).toBe('');
  });

  it('generates valid WhatsApp URLs with encoded messages', () => {
    const url = getWhatsAppUrl('0771234567', 'Hello from Print To Frame');
    expect(url).toContain('https://wa.me/94771234567?text=Hello%20from%20Print%20To%20Frame');
  });

  it('formats dispatch messages with COD balances when unpaid', () => {
    const msg = formatDispatchMessage({
      customerName: 'Naveen Perera',
      location: 'Colombo 03',
      subType: 'Gallery Canvas Frame',
      driverName: 'Sunil',
      driverPhone: '0773456789',
      vehiclePlate: 'WP GE 1234',
      id: 'L-DL-001',
      balanceDue: 25000
    });

    expect(msg).toContain('Naveen Perera');
    expect(msg).toContain('L-DL-001');
    expect(msg).toContain('Sunil');
    expect(msg).toContain('25,000');
  });

  it('calculates COD balance correctly from ERP invoices list', () => {
    const sampleInvoices = [
      { id: 'INV-001', linkedJobNo: 'PTF-1001', customerName: 'Apex Designs', amount: 15000, status: 'Unpaid' },
      { id: 'INV-002', linkedJobNo: 'PTF-1001', customerName: 'Apex Designs', amount: 45000, status: 'Paid' },
      { id: 'INV-003', linkedJobNo: 'PTF-9999', customerName: 'Other Client', amount: 10000, status: 'Unpaid' },
    ];

    const res = calculateCODFromInvoices(sampleInvoices, 'PTF-1001', 'Apex Designs');
    expect(res.hasUnpaid).toBe(true);
    expect(res.totalBalanceDue).toBe(15000);
    expect(res.matchedInvoices.length).toBe(2);
  });

  it('provides predefined fleet vehicles and driver directory', () => {
    expect(FLEET_VEHICLES.length).toBeGreaterThanOrEqual(3);
    expect(DRIVER_DIRECTORY.length).toBeGreaterThanOrEqual(4);
  });
});
