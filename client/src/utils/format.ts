// Strict INR formatting utility with Indian number system (e.g. ₹1,25,000.00)
export function formatINR(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Indian locale date and time formatting (Asia/Kolkata)
export function formatDate(dateStr: string | null | undefined, includeTime = true): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
    };
    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch {
    return dateStr;
  }
}

