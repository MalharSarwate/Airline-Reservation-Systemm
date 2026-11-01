import type { Booking } from '../types';
export function demoTicket(booking: Booking): Response {
  const lines = [
    'AEROLINE - DEMO E-TICKET',
    'NOT VALID FOR TRAVEL',
    `PNR: ${booking.pnr} | ${booking.status}`,
    `${booking.flight.flightNumber}: ${booking.flight.origin} to ${booking.flight.destination}`,
    `Departure UTC: ${booking.flight.departure}`,
    `Arrival UTC: ${booking.flight.arrival}`,
    `Total: INR ${booking.total} - no real payment`,
    ...booking.passengers.map(
      (p) => `${p.name} - Seat ${p.seatNumber} - ${p.baggage} / ${p.meal}`,
    ),
    'This booking exists only in this browser.',
  ];
  const safe = (s: string) =>
    s
      .replace(/[^ -~]/g, '?')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  const stream =
    'BT /F1 11 Tf 48 740 Td 23 TL ' +
    lines.map((line, i) => `${i ? 'T* ' : ''}(${safe(line)}) Tj`).join('\n') +
    ' ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ticket-${booking.pnr}.pdf`,
    },
  });
}
