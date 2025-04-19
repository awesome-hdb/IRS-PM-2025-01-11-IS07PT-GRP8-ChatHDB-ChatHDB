import { Transaction } from './hdbData';

/**
 * Extracts the average storey from a storey range string
 * @param storeyRange - Storey range string (e.g., "01 TO 03")
 * @returns Average storey number
 */
export function getAverageStorey(storeyRange: string): number {
  try {
    const match = storeyRange.match(/(\d+)\s+TO\s+(\d+)/i);
    if (match && match.length >= 3) {
      const min = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      return (min + max) / 2;
    }
    
    // If it's a single number
    const singleMatch = storeyRange.match(/(\d+)/);
    if (singleMatch && singleMatch.length >= 2) {
      return parseInt(singleMatch[1], 10);
    }
    
    return 0;
  } catch (error) {
    console.error('Error parsing storey range:', error);
    return 0;
  }
}

/**
 * Extracts the remaining lease years from a lease string
 * @param remainingLease - Remaining lease string (e.g., "61 years 04 months")
 * @returns Remaining lease in years (decimal)
 */
export function getRemainingLeaseYears(remainingLease: string): number {
  try {
    const match = remainingLease.match(/(\d+)\s+years\s+(\d+)\s+months/i);
    if (match && match.length >= 3) {
      const years = parseInt(match[1], 10);
      const months = parseInt(match[2], 10);
      return years + (months / 12);
    }
    
    // If it's just years
    const yearsMatch = remainingLease.match(/(\d+)\s+years/i);
    if (yearsMatch && yearsMatch.length >= 2) {
      return parseInt(yearsMatch[1], 10);
    }
    
    return 0;
  } catch (error) {
    console.error('Error parsing remaining lease:', error);
    return 0;
  }
}

/**
 * Prepares property data for ML model prediction
 * @param transaction - Transaction data
 * @param currentDate - Current date (defaults to today)
 * @returns Prepared property data for ML model
 */
export function preparePropertyDataForML(transaction: Transaction, currentDate = new Date()): any {
  // Extract storey average
  const storeyAvg = getAverageStorey(transaction.storey_range);
  
  // Extract remaining lease
  const remainingLease = transaction.remaining_lease ? 
    getRemainingLeaseYears(transaction.remaining_lease) : 0;
  
  // Extract lease commence date
  const leaseCommenceDate = parseInt(transaction.lease_commence_date, 10);
  
  // Current year and month
  const year = currentDate.getFullYear();
  const monthNum = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  return {
    floor_area_sqm: transaction.floor_area_sqm,
    storey_avg: storeyAvg,
    remaining_lease: remainingLease,
    lease_commence_date: leaseCommenceDate,
    year: year,
    month_num: monthNum,
    town: transaction.town || '',
    flat_type: transaction.flat_type || ''
  };
}

/**
 * Formats a price number with commas and dollar sign
 * @param price - Price number
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Calculates the price per square meter
 * @param price - Price in dollars
 * @param area - Area in square meters
 * @returns Price per square meter
 */
export function calculatePricePerSqm(price: number, area: number): number {
  if (!area || area <= 0) return 0;
  return Math.round(price / area);
}

/**
 * Formats a percentage value
 * @param value - Value as a decimal (e.g., 0.05 for 5%)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  return (value * 100).toFixed(2) + '%';
} 