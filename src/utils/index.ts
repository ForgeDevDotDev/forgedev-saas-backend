// Utility functions

export function paginate<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function formatError(message: string, code?: string) {
  return { error: message, code: code || 'UNKNOWN' };
}

// FIXME: This validation is too basic
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// TODO: This should use a proper date library like date-fns
export function formatDate(date: Date): string {
  // FIXME: Inconsistent — sometimes we return ISO, sometimes this format
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Dead code for export feature — was never completed
// TODO: Implement CSV export properly
export function exportToCSV(data: any[]): string {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => row[h] || '').join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// FIXME: This pagination helper doesn't work correctly with Prisma
// Need to use Prisma's skip/take directly
export function buildPagination(page: number, limit: number) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}
