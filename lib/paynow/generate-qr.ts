// Singapore PayNow QR generation.
//
// PayNow QR follows the EMVCo-based SGQR standard: a tag-length-value string
// that any local banking app can scan to pre-fill a person-to-person transfer.
// No payment gateway or merchant account is involved, this module only builds
// the scannable string. The money movement happens inside the payer's bank app.
//
// The highest-risk thing here is the CRC. A wrong checksum or a mis-ordered
// field produces a QR that looks fine but fails silently in a real banking app,
// so always scan a generated code with an actual SG bank app before trusting it.
//
// Reference: https://www.mas.gov.sg/development/e-payments/sgqr

export interface PayNowQRParams {
  recipientType: 'phone' | 'nric' | 'uen';
  recipientValue: string; // e.g. '+6591234567', 'S1234567A' or '201234567W'
  amount: number;
  reference: string; // e.g. "Tokyo trip"
  /** When false the payer cannot edit the amount in their banking app. */
  amountEditable?: boolean;
  expiryDate?: string; // YYYYMMDD
}

/** Build one EMVCo tag-length-value field. Length is the value's char count. */
function field(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

/** Normalise a mobile number to the +65XXXXXXXX proxy form PayNow expects. */
function normaliseMobile(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('65')) return `+${digits}`;
  if (digits.length === 8) return `+65${digits}`;
  return `+${digits}`;
}

/**
 * CRC-16/CCITT-FALSE as required by the EMVCo spec.
 * Polynomial 0x1021, initial value 0xFFFF, no final XOR, big-endian, upper hex.
 */
export function computeCRC16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPayNowQRString(params: PayNowQRParams): string {
  // PayNow proxy type: 0 = mobile, 1 = NRIC/FIN, 2 = UEN.
  const proxyType =
    params.recipientType === 'phone' ? '0' : params.recipientType === 'nric' ? '1' : '2';

  const recipientValue =
    params.recipientType === 'phone'
      ? normaliseMobile(params.recipientValue)
      : params.recipientValue.toUpperCase();

  // Tag 26: merchant account information for PayNow.
  const payNowData =
    field('00', 'SG.PAYNOW') +
    field('01', proxyType) +
    field('02', recipientValue) +
    // amount editable flag, 1 = locked to the amount below, 0 = editable
    field('03', params.amountEditable ? '0' : '1') +
    (params.expiryDate ? field('04', params.expiryDate) : '');

  const fields: string[] = [
    field('00', '01'), // payload format indicator
    // point of initiation: 12 = dynamic (carries an amount), 11 = static
    field('01', params.amount > 0 ? '12' : '11'),
    field('26', payNowData),
    field('52', '0000'), // merchant category code, not applicable for P2P
    field('53', '702'), // currency, 702 = SGD
  ];

  if (params.amount > 0) {
    fields.push(field('54', params.amount.toFixed(2)));
  }

  fields.push(field('58', 'SG')); // country code
  fields.push(field('59', params.reference.slice(0, 25) || 'NA')); // recipient/name line
  fields.push(field('60', 'Singapore')); // city
  // Tag 62: additional data, sub-tag 01 = bill / reference number.
  fields.push(field('62', field('01', params.reference.slice(0, 25))));

  // CRC (tag 63, length 04) is computed over everything up to and including the
  // "6304" prefix itself.
  const withoutCRC = fields.join('') + '6304';
  return withoutCRC + computeCRC16(withoutCRC);
}
