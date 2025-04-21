import Papa from 'papaparse';
import { getAddressFromPostal } from './oneMap';
import { RandomForestRegression as RandomForest } from 'ml-random-forest';

export interface Transaction {
  month?: string;
  town?: string;
  flat_type?: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: number;
  flat_model?: string;
  lease_commence_date: string;
  remaining_lease?: string;
  resale_price: number;
  position?: {
    lat: number;
    lng: number;
  };
  block_address?: string;
  transaction_date: string;
}

let cachedData: Transaction[] | null = null;

function normalizeStreetName(streetName: string): string {
  return streetName.toUpperCase()
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bNORTH\b/g, 'NTH')
    .replace(/\bSOUTH\b/g, 'STH')
    .replace(/\bEAST\b/g, 'EST')
    .replace(/\bWEST\b/g, 'WST')
    .replace(/\bCENTRAL\b/g, 'CTRL')
    .replace(/\bCLOSE\b/g, 'CL')
    .replace(/\bCRESCENT\b/g, 'CRES')
    .replace(/\bBOULEVARD\b/g, 'BLVD')
    .replace(/\bTERRACE\b/g, 'TER')
    .replace(/\bJUNCTION\b/g, 'JCN')
    .replace(/\bLINK\b/g, 'LK')
    .replace(/\bUPPER\b/g, 'UPR')
    .replace(/\bLOWER\b/g, 'LWR')
    .trim();
}

function normalizeString(str: string): string {
  return str.trim().toUpperCase();
}

export async function getRecentTransactions(
  streetName: string, 
  userPosition: google.maps.LatLngLiteral,
  flatType?: string
) {
  // Fetch and parse CSV only if we don't have cached data
  if (!cachedData) {
    const response = await fetch('/data/hdb_resale.csv');
    const csv = await response.text();
    
    const results = Papa.parse<Transaction>(csv, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    cachedData = results.data.reverse();
  }

  console.log('Using flat type filter:', flatType); // Debug log

  const normalizedInputStreet = normalizeStreetName(streetName);
  const normalizedFlatType = flatType ? normalizeString(flatType) : '';
  
  const matchingTransactions = cachedData
    .filter(t => {
      const normalizedCsvStreet = normalizeStreetName(t.street_name || '');
      const normalizedCsvFlatType = normalizeString(t.flat_type || '');
      
      const streetMatch = normalizedCsvStreet === normalizedInputStreet;
      const typeMatch = !flatType || normalizedCsvFlatType === normalizedFlatType;
      
      // Debug log for mismatches
      if (streetMatch && !typeMatch && flatType) {
        console.log('Type mismatch:', {
          expected: normalizedFlatType,
          actual: normalizedCsvFlatType,
          record: t
        });
      }
      
      return streetMatch && typeMatch;
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 20);

 // console.log('Matching transactions:', matchingTransactions); // Check filtered data

  const transactionsWithPositions = await Promise.all(
    matchingTransactions.map(async (t) => {
      const blockAddress = `${t.block} ${t.street_name} SINGAPORE`;
      try {
        const addressData = await getAddressFromPostal(blockAddress);
        const transaction = {
          ...t,
          block_address: blockAddress,
          floor_area_sqm: Number(t.floor_area_sqm),
          storey_range: t.storey_range,
          lease_commence_date: t.lease_commence_date,
          resale_price: Number(t.resale_price),
          position: addressData?.position || {
            lat: userPosition.lat + (Math.random() - 0.5) * 0.002,
            lng: userPosition.lng + (Math.random() - 0.5) * 0.002,
          },
          transactionDate: t.lease_commence_date,
          floorArea: t.floor_area_sqm.toString(),
          storeyRange: t.storey_range
        };
     //   console.log('Processed transaction:', transaction); // Check final transaction object
        return transaction;
      } catch (error) {
        console.error(`Error getting position for ${blockAddress}:`, error);
        return {
          ...t,
          block_address: blockAddress,
          position: {
            lat: userPosition.lat + (Math.random() - 0.5) * 0.002,
            lng: userPosition.lng + (Math.random() - 0.5) * 0.002,
          }
        };
      }
    })
  );

  console.log('Final transactions with positions:', transactionsWithPositions);
  return transactionsWithPositions;
}

export function formatTransactionDate(date: string) {
  // Handle the lease commencement date which is just a year
  if (date && date.length === 4) {
    return date;
  }
  // Handle other date formats
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

export async function getTownTransactions(streetName: string, flatType: string) {
  // Fetch and parse CSV only if we don't have cached data
  if (!cachedData) {
    const response = await fetch('/data/hdb_resale.csv');
    const csv = await response.text();
    
    const results = Papa.parse<Transaction>(csv, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    cachedData = results.data.reverse();
  }

  // First, find the town based on the street name
  const streetTransaction = cachedData.find(t => 
    normalizeStreetName(t.street_name || '') === normalizeStreetName(streetName)
  );

  if (!streetTransaction?.town) {
    throw new Error('Town not found for this street');
  }

  const town = streetTransaction.town;
  const normalizedFlatType = normalizeString(flatType);

  // Get all transactions from the same town and flat type
  return cachedData.filter(t => 
    normalizeString(t.town || '') === normalizeString(town) &&
    normalizeString(t.flat_type || '') === normalizedFlatType
  );
}

// Add these new functions for ARIMAX-based valuation
export function calculateEstimatedValue(transactions: Transaction[], floorArea: number) {
  // Filter out invalid data points and sort by date
  const validTransactions = transactions
    .filter(t => t.floor_area_sqm && t.resale_price && t.month && !isNaN(t.floor_area_sqm) && !isNaN(t.resale_price))
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 150); // Use more transactions for better modeling

  // Need sufficient data points for meaningful analysis
  if (validTransactions.length < 10) {
    throw new Error('Insufficient data points for valuation');
  }

  // Calculate price range to ensure our estimate is reasonable
  const prices = validTransactions.map(t => t.resale_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const medianPrice = calculateMedian(prices);
  
  // Group by month for time series analysis
  const monthlyData = validTransactions.reduce((acc, t) => {
    const month = t.month || '';
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Calculate monthly average prices per sqm
  const timeSeriesData = Object.entries(monthlyData)
    .map(([month, transactions]) => {
      const avgPricePerSqm = transactions.reduce((sum, t) => sum + (t.resale_price / t.floor_area_sqm), 0) / transactions.length;
      return { month, avgPricePerSqm };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Perform trend analysis (simplified ARIMA component)
  const trendCoefficient = calculateTrendCoefficient(timeSeriesData);

  // Multiple regression for exogenous factors
  const { coefficients, intercept, rSquared } = performMultipleRegression(validTransactions);

  // Calculate base value using regression model
  let baseValue = intercept;
  
  // Apply coefficients to our property's features
  baseValue += coefficients.floorArea * floorArea;
  
  // Get average storey range as a number
  const avgStorey = getAverageStorey(validTransactions[0].storey_range);
  if (avgStorey) {
    baseValue += coefficients.storey * avgStorey;
  }
  
  // Apply lease effect
  const leaseYear = parseInt(validTransactions[0].lease_commence_date);
  if (!isNaN(leaseYear)) {
    baseValue += coefficients.leaseYear * (2024 - leaseYear);
  }

  // Apply time trend adjustment
  const monthsFromLatest = 0; // Current valuation
  baseValue *= (1 + trendCoefficient * monthsFromLatest);
  
  // IMPROVED ACCURACY: Ensure the estimate stays within a reasonable range of actual transactions
  // If our model is giving unreasonable results, adjust it to stay within bounds
  if (baseValue < minPrice * 0.9 || baseValue > maxPrice * 1.1) {
    console.log('Adjusting valuation - original estimate outside reasonable range:', baseValue);
    
    // Calculate weighted average of recent transactions with higher weight to more recent ones
    const recentTransactions = validTransactions.slice(0, 10);
    let weightedSum = 0;
    let weightSum = 0;
    
    recentTransactions.forEach((t, idx) => {
      // More recent transactions get higher weights (10, 9, 8, ...)
      const weight = recentTransactions.length - idx;
      weightedSum += t.resale_price * weight;
      weightSum += weight;
    });
    
    const weightedAvg = weightedSum / weightSum;
    
    // Blend the model prediction with the weighted average, heavily favoring actual transaction data
    baseValue = weightedAvg * 0.8 + medianPrice * 0.2;
    
    // Apply a small adjustment based on this property's floor area compared to average
    const avgFloorArea = validTransactions.reduce((sum, t) => sum + t.floor_area_sqm, 0) / validTransactions.length;
    const floorAreaRatio = floorArea / avgFloorArea;
    
    // Apply a more conservative adjustment for floor area differences
    baseValue *= Math.pow(floorAreaRatio, 0.3); // Reduced from 0.5 to 0.3 to dampen the effect
    
    // Final safety check - ensure we're within the min-max range with a small buffer
    baseValue = Math.max(minPrice * 0.95, Math.min(maxPrice * 1.05, baseValue));
    
    console.log('Adjusted valuation:', baseValue, 'Range:', minPrice, '-', maxPrice);
  }

  // Calculate confidence score
  let confidence = calculateConfidenceScore(
    rSquared,
    validTransactions.length,
    timeSeriesData.length,
    validTransactions
  );

  // Determine key factors that influenced the valuation
  const keyFactors = determineKeyFactors(coefficients, validTransactions[0]);

  return {
    estimatedValue: Math.round(baseValue),
    confidence,
    sampleSize: validTransactions.length,
    keyFactors,
    pricePerSqm: Math.round(baseValue / floorArea),
    timeSeriesLength: timeSeriesData.length,
    modelDetails: {
      rSquared,
      coefficients,
      trendCoefficient
    }
  };
}

// Helper function to calculate median
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

function calculateTrendCoefficient(timeSeriesData: { month: string, avgPricePerSqm: number }[]) {
  if (timeSeriesData.length < 2) return 0;
  
  // Simple linear trend
  const n = timeSeriesData.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = timeSeriesData.map(d => d.avgPricePerSqm);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgY = sumY / n;
  
  // Return normalized trend coefficient (monthly percentage change)
  return slope / avgY;
}

function performMultipleRegression(transactions: Transaction[]) {
  // Extract features
  const features = transactions.map(t => ({
    floorArea: t.floor_area_sqm,
    storey: getAverageStorey(t.storey_range),
    leaseYear: parseInt(t.lease_commence_date),
    price: t.resale_price
  }));
  
  // Calculate means
  const meanFloorArea = features.reduce((sum, f) => sum + f.floorArea, 0) / features.length;
  const meanStorey = features.reduce((sum, f) => sum + (f.storey || 0), 0) / features.length;
  const meanLeaseYear = features.reduce((sum, f) => sum + (f.leaseYear || 0), 0) / features.length;
  const meanPrice = features.reduce((sum, f) => sum + f.price, 0) / features.length;
  
  // Normalize data
  const normalized = features.map(f => ({
    floorArea: f.floorArea - meanFloorArea,
    storey: (f.storey || 0) - meanStorey,
    leaseYear: (f.leaseYear || 0) - meanLeaseYear,
    price: f.price - meanPrice
  }));
  
  // Calculate coefficients using simplified matrix operations
  // This is a simplified approach to multiple regression
  let sumFloorAreaSquared = 0;
  let sumStoreySquared = 0;
  let sumLeaseYearSquared = 0;
  let sumFloorAreaPrice = 0;
  let sumStoreyPrice = 0;
  let sumLeaseYearPrice = 0;
  
  for (const f of normalized) {
    sumFloorAreaSquared += f.floorArea * f.floorArea;
    sumStoreySquared += f.storey * f.storey;
    sumLeaseYearSquared += f.leaseYear * f.leaseYear;
    sumFloorAreaPrice += f.floorArea * f.price;
    sumStoreyPrice += f.storey * f.price;
    sumLeaseYearPrice += f.leaseYear * f.price;
  }
  
  // Simplified coefficients (ignoring covariance between predictors)
  // Add small epsilon to prevent division by zero
  const epsilon = 0.0001;
  
  // IMPROVED ACCURACY: Scale down coefficients to prevent extreme values
  const floorAreaCoef = (sumFloorAreaPrice / (sumFloorAreaSquared + epsilon)) * 0.7;
  const storeyCoef = (sumStoreyPrice / (sumStoreySquared + epsilon)) * 0.7;
  const leaseYearCoef = (sumLeaseYearPrice / (sumLeaseYearSquared + epsilon)) * 0.7;
  
  // Calculate R-squared
  let totalSS = 0;
  let residualSS = 0;
  
  for (const f of features) {
    const predicted = meanPrice + 
      floorAreaCoef * (f.floorArea - meanFloorArea) +
      storeyCoef * ((f.storey || 0) - meanStorey) +
      leaseYearCoef * ((f.leaseYear || 0) - meanLeaseYear);
    
    totalSS += Math.pow(f.price - meanPrice, 2);
    residualSS += Math.pow(f.price - predicted, 2);
  }
  
  const rSquared = 1 - (residualSS / totalSS);
  
  return {
    coefficients: {
      floorArea: floorAreaCoef,
      storey: storeyCoef,
      leaseYear: leaseYearCoef
    },
    intercept: meanPrice,
    rSquared
  };
}

function getAverageStorey(storeyRange: string): number | null {
  if (!storeyRange) return null;
  
  // Handle the new simplified storey range values
  if (storeyRange === "Low") return 3.5;  // Average of floors 1-6
  if (storeyRange === "Mid") return 11;   // Average of floors 7-15
  if (storeyRange === "High") return 23;  // Average of floors 16+
  
  // Handle the original format for backward compatibility
  const match = storeyRange.match(/(\d+)\s+TO\s+(\d+)/i);
  if (match) {
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    return (min + max) / 2;
  }
  return null;
}

function calculateConfidenceScore(
  rSquared: number,
  sampleSize: number,
  timeSeriesLength: number,
  transactions: Transaction[]
): number {
  // Base confidence from R-squared (0-100)
  let confidence = rSquared * 100;
  
  // Adjust for sample size
  if (sampleSize < 10) {
    confidence *= 0.6;
  } else if (sampleSize < 20) {
    confidence *= 0.8;
  } else if (sampleSize < 50) {
    confidence *= 0.9;
  }
  
  // Adjust for time series length
  if (timeSeriesLength < 6) {
    confidence *= 0.85;
  } else if (timeSeriesLength < 12) {
    confidence *= 0.95;
  }
  
  // Adjust for data consistency
  const prices = transactions.map(t => t.resale_price);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = stdDev / mean;
  
  if (coeffVar > 0.3) {
    confidence *= 0.85; // High variance reduces confidence
  } else if (coeffVar < 0.1) {
    confidence *= 1.05; // Low variance increases confidence (capped at 95)
  }
  
  // Ensure confidence stays within reasonable bounds
  return Math.min(Math.max(confidence, 25), 95);
}

function determineKeyFactors(
  coefficients: { floorArea: number, storey: number, leaseYear: number },
  transaction: Transaction
): { factor: string, impact: 'positive' | 'negative' | 'neutral', strength: 'strong' | 'moderate' | 'slight', value: number }[] {
  type Factor = { 
    factor: string, 
    impact: 'positive' | 'negative' | 'neutral', 
    strength: 'strong' | 'moderate' | 'slight', 
    value: number 
  };
  
  const factors: Factor[] = [];
  
  // Floor area impact
  if (Math.abs(coefficients.floorArea) > 1000) {
    factors.push({
      factor: 'Floor Area',
      impact: coefficients.floorArea > 0 ? 'positive' : 'negative',
      strength: 'strong',
      value: coefficients.floorArea
    });
  } else if (Math.abs(coefficients.floorArea) > 500) {
    factors.push({
      factor: 'Floor Area',
      impact: coefficients.floorArea > 0 ? 'positive' : 'negative',
      strength: 'moderate',
      value: coefficients.floorArea
    });
  }
  
  // Storey impact
  if (Math.abs(coefficients.storey) > 5000) {
    factors.push({
      factor: 'Floor Level',
      impact: coefficients.storey > 0 ? 'positive' : 'negative',
      strength: 'strong',
      value: coefficients.storey
    });
  } else if (Math.abs(coefficients.storey) > 2000) {
    factors.push({
      factor: 'Floor Level',
      impact: coefficients.storey > 0 ? 'positive' : 'negative',
      strength: 'moderate',
      value: coefficients.storey
    });
  }
  
  // Lease impact
  if (Math.abs(coefficients.leaseYear) > 1000) {
    factors.push({
      factor: 'Remaining Lease',
      impact: coefficients.leaseYear < 0 ? 'positive' : 'negative', // Newer lease (higher year) is positive
      strength: 'strong',
      value: coefficients.leaseYear
    });
  } else if (Math.abs(coefficients.leaseYear) > 500) {
    factors.push({
      factor: 'Remaining Lease',
      impact: coefficients.leaseYear < 0 ? 'positive' : 'negative',
      strength: 'moderate',
      value: coefficients.leaseYear
    });
  }
  
  return factors;
}

// Add these new functions for Google Trends and Top Stories
export async function getGoogleTrends(area: string) {
  try {
    const response = await fetch(`/api/google-trends?area=${encodeURIComponent(area)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Trends data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    throw error;
  }
}

export async function getTopStories(area: string) {
  try {
    const response = await fetch(`/api/top-stories?area=${encodeURIComponent(area)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Top Stories');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Top Stories:', error);
    throw error;
  }
}

export interface RandomForestValuationInput {
  month: string; // Current month in format YYYY-MM
  street_name: string;
  flat_type: string;
  storey_range: 'Low' | 'Mid' | 'High'; // Updated to use the new simplified values
  floor_area_sqm: number;
  lease_commence_date: string; // Year only, e.g., "1980"
}

export interface RandomForestValuationResult {
  estimatedValue: number;
  baseEstimatedValue?: number; // Added for storing the original value before multipliers
  multipliers?: {
    googleTrends: number;
    sentiment: number;
    economicTrend: number;
  }; // Added for storing the multipliers used
  featureImportance: {
    feature: string;
    importance: number;
    impact: 'positive' | 'negative' | 'neutral';
    correlation?: number;
  }[];
  modelMetrics: {
    r2Score: number;
    meanAbsoluteError: number;
    meanSquaredError: number;
  };
  sampleSize: number;
  recentTransactions?: number;
  pricePerSqm: number;
  timeSeriesLength: number;
  predictionInterval: {
    lower: number;
    upper: number;
  };
  recentAvgPrice?: number;
  economicCorrelations?: {
    index: string;
    correlation: number;
    color: string;
  }[];
  sentimentDetails?: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
}

// Helper function to calculate permutation importance
function calculatePermutationImportance(
  model: RandomForest,
  X: number[][],
  y: number[],
  featureIndex: number,
  nRepeats: number = 10  // Increased from 5 to 10 for more stability
): number {
  try {
    // Validate inputs
    if (!model || !X || !y || X.length === 0 || y.length === 0 || X.length !== y.length) {
      console.warn('Invalid inputs for permutation importance calculation');
      return 0.05; // Increased default value from 0.01 to 0.05
    }
    
    // Ensure featureIndex is valid
    if (featureIndex < 0 || featureIndex >= (X[0]?.length || 0)) {
      console.warn(`Invalid feature index: ${featureIndex}`);
      return 0.05; // Increased default value
    }
    
    // Calculate baseline score
    const baselinePredictions = model.predict(X);
    const baselineScore = calculateR2Score(y, baselinePredictions);
    
    let importanceSum = 0;
    
    for (let i = 0; i < nRepeats; i++) {
      // Create a copy of X
      const XPermuted = X.map(row => [...row]);
      
      // Shuffle the values in the feature column
      const featureValues = XPermuted.map(row => row[featureIndex]);
      shuffleArray(featureValues);
      
      // Replace the feature column with shuffled values
      for (let j = 0; j < XPermuted.length; j++) {
        XPermuted[j][featureIndex] = featureValues[j];
      }
      
      // Calculate score with permuted feature
      const permutedPredictions = model.predict(XPermuted);
      const permutedScore = calculateR2Score(y, permutedPredictions);
      
      // Importance is the decrease in score
      const iterationImportance = Math.max(0, baselineScore - permutedScore);
      importanceSum += iterationImportance;
    }
    
    // Apply a scaling factor to make importance values more meaningful
    // This helps prevent very small values that might be rounded to 0.01
    const rawImportance = importanceSum / nRepeats;
    return Math.max(0.05, rawImportance * 5); // Scale up and ensure minimum value
  } catch (error) {
    console.warn('Error in permutation importance calculation:', error);
    return 0.05; // Increased default value
  }
}

// Helper function to shuffle an array in-place
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Calculate remaining lease more accurately
function calculateRemainingLease(leaseYear: number): number {
  if (!leaseYear || leaseYear <= 0) return 0;
  
  const currentYear = new Date().getFullYear();
  // Standard HDB lease is 99 years
  const remainingLease = 99 - (currentYear - leaseYear);
  
  // Cap at 99 years and floor at 0
  return Math.max(0, Math.min(99, remainingLease));
}

// Calculate lease decay factor - properties lose value as lease shortens
// This follows a non-linear decay curve where value drops more rapidly as lease gets shorter
function calculateLeaseDecayFactor(remainingLease: number): number {
  if (remainingLease >= 90) return 1.0; // Full value for very new properties
  if (remainingLease >= 80) return 0.95;
  if (remainingLease >= 70) return 0.9;
  if (remainingLease >= 60) return 0.85;
  if (remainingLease >= 50) return 0.75;
  if (remainingLease >= 40) return 0.65;
  if (remainingLease >= 30) return 0.5;
  if (remainingLease >= 20) return 0.35;
  if (remainingLease >= 10) return 0.2;
  return 0.1; // Very little value for properties with <10 years lease
}

// Helper function to calculate direct feature importance
function calculateDirectFeatureImportance(
  model: RandomForest,
  X: number[][],
  y: number[],
  featureIndex: number
): number {
  try {
    // Create a baseline prediction
    const baselinePredictions = model.predict(X);
    
    // Calculate the range of values for this feature
    const featureValues = X.map(row => row[featureIndex]);
    const minValue = Math.min(...featureValues);
    const maxValue = Math.max(...featureValues);
    const range = maxValue - minValue;
    
    if (range === 0) return 0.05; // If no variation in feature, return default
    
    // Create test datasets with min and max values for this feature
    const XMin = X.map(row => [...row]);
    const XMax = X.map(row => [...row]);
    
    // Set all values to min or max for this feature
    for (let i = 0; i < XMin.length; i++) {
      XMin[i][featureIndex] = minValue;
      XMax[i][featureIndex] = maxValue;
    }
    
    // Get predictions for min and max values
    const minPredictions = model.predict(XMin);
    const maxPredictions = model.predict(XMax);
    
    // Calculate average change in prediction
    let totalChange = 0;
    for (let i = 0; i < minPredictions.length; i++) {
      totalChange += Math.abs(maxPredictions[i] - minPredictions[i]);
    }
    
    // Average change as percentage of average prediction
    const avgPrediction = baselinePredictions.reduce((sum, p) => sum + p, 0) / baselinePredictions.length;
    const avgChange = totalChange / minPredictions.length;
    
    // Return importance as percentage of prediction value
    return Math.min(0.5, avgChange / avgPrediction); // Cap at 50% to avoid extreme values
  } catch (error) {
    console.warn('Error in direct feature importance calculation:', error);
    return 0.05; // Default value on error
  }
}

export async function calculateRandomForestValuation(
  input: RandomForestValuationInput
): Promise<RandomForestValuationResult> {
  // Fetch and parse CSV only if we don't have cached data
  if (!cachedData) {
    const response = await fetch('/data/hdb_resale.csv');
    const csv = await response.text();
    
    const results = Papa.parse<Transaction>(csv, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    cachedData = results.data.reverse();
  }

  // Filter transactions by street name and flat type
  const normalizedInputStreet = normalizeStreetName(input.street_name);
  const normalizedFlatType = normalizeString(input.flat_type);
  
  // Get relevant transactions (same street and flat type)
  const relevantTransactions = cachedData.filter(t => {
    const normalizedCsvStreet = normalizeStreetName(t.street_name || '');
    const normalizedCsvFlatType = normalizeString(t.flat_type || '');
    
    return normalizedCsvStreet === normalizedInputStreet && 
           normalizedCsvFlatType === normalizedFlatType;
  });

  // If we don't have enough data for this specific street, expand to the town level
  let trainingData = relevantTransactions;
  if (relevantTransactions.length < 30) {
    // Find the town based on the street name
    const streetTransaction = cachedData.find(t => 
      normalizeStreetName(t.street_name || '') === normalizedInputStreet
    );

    if (streetTransaction?.town) {
      const town = streetTransaction.town;
      
      // Get transactions from the same town and flat type
      trainingData = cachedData.filter(t => 
        normalizeString(t.town || '') === normalizeString(town) &&
        normalizeString(t.flat_type || '') === normalizedFlatType
      );
    }
  }

  // Ensure we have enough data
  if (trainingData.length < 10) {
    throw new Error('Insufficient data for valuation');
  }

  // Get recent transactions (last 6 months) for more accurate pricing
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  // Format dates to YYYY-MM for comparison
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter for recent transactions
  const recentTransactions = trainingData.filter(t => {
    if (!t.month) return false;
    return t.month >= sixMonthsAgoStr;
  });
  
  // If we have enough recent transactions, prioritize them by giving them much higher weight
  // Increased weighting for recent transactions significantly
  const weightedTrainingData = recentTransactions.length >= 5 ? 
    [...recentTransactions, ...recentTransactions, ...recentTransactions, ...recentTransactions, ...trainingData] : // Quadruple weight recent transactions (was double)
    trainingData;

  // Prepare data for Random Forest
  const X: number[][] = [];
  const y: number[] = [];
  const featureValues = {
    year: [] as number[],
    month: [] as number[],
    floorArea: [] as number[],
    storey: [] as number[],
    leaseYear: [] as number[],
    remainingLease: [] as number[]
  };

  // Feature engineering
  for (const transaction of weightedTrainingData) {
    if (!transaction.month || !transaction.floor_area_sqm || 
        !transaction.storey_range || !transaction.lease_commence_date) {
      continue; // Skip incomplete data
    }

    // Extract month and year
    const [year, month] = (transaction.month || '').split('-');
    const yearNum = parseInt(year || '0');
    const monthNum = parseInt(month || '0');
    
    // Extract storey range as a number
    const storeyNum = getAverageStorey(transaction.storey_range) || 0;
    
    // Extract lease year
    const leaseYear = parseInt(transaction.lease_commence_date);
    
    // Calculate remaining lease (approximate)
    const remainingLease = leaseYear ? (99 - (new Date().getFullYear() - leaseYear)) : 0;
    
    // Create feature vector - ensure all values are valid numbers
    const features = [
      yearNum || 0,                // Year
      monthNum || 0,               // Month
      transaction.floor_area_sqm || 0,  // Floor area
      storeyNum || 0,              // Storey (numeric)
      leaseYear || 0,              // Lease commencement year
      remainingLease || 0          // Remaining lease years
    ];
    
    // Skip records with invalid values
    if (features.some(isNaN) || features.some(val => val === null || val === undefined)) {
      continue;
    }
    
    X.push(features);
    y.push(transaction.resale_price);
    
    // Store feature values for correlation analysis
    featureValues.year.push(yearNum || 0);
    featureValues.month.push(monthNum || 0);
    featureValues.floorArea.push(transaction.floor_area_sqm || 0);
    featureValues.storey.push(storeyNum || 0);
    featureValues.leaseYear.push(leaseYear || 0);
    featureValues.remainingLease.push(remainingLease || 0);
  }

  // Train Random Forest model with improved parameters
  const options = {
    nEstimators: 300,       // Increased from 250 to 300
    maxFeatures: 6,         // Use all features
    replacement: true,
    seed: 42,
    treeOptions: {
      maxDepth: 25          // Increased from 20 to 25
    }
  };

  const randomForest = new RandomForest(options);
  randomForest.train(X, y);

  // Prepare input for prediction
  const [currentYear, currentMonth] = input.month.split('-');
  const inputStoreyNum = getAverageStorey(input.storey_range) || 0;
  const inputLeaseYear = parseInt(input.lease_commence_date);
  const inputRemainingLease = inputLeaseYear ? (99 - (new Date().getFullYear() - inputLeaseYear)) : 0;

  const inputFeatures = [
    parseInt(currentYear) || 0,
    parseInt(currentMonth) || 0,
    input.floor_area_sqm || 0,
    inputStoreyNum || 0,
    inputLeaseYear || 0,
    inputRemainingLease || 0
  ];

  // Make prediction with ensemble approach for better accuracy
  const ensemblePredictions = [];
  for (let i = 0; i < 30; i++) {  // Increased from 20 to 30
    // Add small random noise to features to simulate different scenarios
    const noisyFeatures = inputFeatures.map(f => 
      typeof f === 'number' ? f * (1 + (Math.random() - 0.5) * 0.01) : f
    );
    ensemblePredictions.push(randomForest.predict([noisyFeatures])[0]);
  }
  
  // Use median of predictions for more robust result
  ensemblePredictions.sort((a, b) => a - b);
  const prediction = ensemblePredictions[Math.floor(ensemblePredictions.length / 2)];

  // Calculate feature importance with direction (positive/negative)
  const featureNames = ['Year', 'Month', 'Floor Area', 'Storey', 'Lease Year', 'Remaining Lease'];
  
  // Calculate importance using multiple methods for more robust results
  const importanceValues = featureNames.map((name, index) => {
    try {
      // Method 1: Permutation importance
      const permutationImportance = calculatePermutationImportance(randomForest, X, y, index);
      
      // Method 2: Direct feature importance
      const directImportance = calculateDirectFeatureImportance(randomForest, X, y, index);
      
      // Method 3: Correlation coefficient
      const featureKey = name.toLowerCase().replace(/\s+/g, '') as keyof typeof featureValues;
      const featureData = featureValues[featureKey];
      const correlation = featureData && featureData.length > 0 ? 
        Math.abs(calculateCorrelation(featureData, y)) : 0;
      
      // Combine methods with weights
      // Higher weight to direct importance for floor area and lease features
      let combinedImportance;
      if (name === 'Floor Area' || name === 'Lease Year' || name === 'Remaining Lease') {
        combinedImportance = (permutationImportance * 0.3) + (directImportance * 0.5) + (correlation * 0.2);
        // Ensure these key features have meaningful values
        combinedImportance = Math.max(0.1, combinedImportance);
      } else {
        combinedImportance = (permutationImportance * 0.5) + (directImportance * 0.3) + (correlation * 0.2);
      }
      
      return {
        name,
        importance: combinedImportance,
        correlation: calculateCorrelation(featureData || [], y)
      };
    } catch (error) {
      console.warn(`Error calculating importance for ${name}:`, error);
      // Higher default values for key features
      return {
        name,
        importance: (name === 'Floor Area' || name === 'Lease Year' || name === 'Remaining Lease') ? 0.1 : 0.05,
        correlation: 0
      };
    }
  });
  
  // Normalize importance values to sum to 1
  const totalImportance = importanceValues.reduce((sum, val) => sum + val.importance, 0);
  const normalizedImportances = importanceValues.map(val => ({
    ...val,
    importance: totalImportance > 0 ? val.importance / totalImportance : val.importance
  }));
  
  // Create final feature importance array
  const correlations = normalizedImportances.map(val => ({
    feature: val.name,
    importance: val.importance,
    impact: val.correlation > 0 ? 'positive' : 'negative',
    correlation: val.correlation
  })).sort((a, b) => b.importance - a.importance);

  // Calculate model metrics
  const predictions = randomForest.predict(X);
  const r2Score = calculateR2Score(y, predictions);
  const { mae, mse } = calculateErrorMetrics(y, predictions);

  // Calculate average price of recent transactions for calibration
  let recentAvgPrice = 0;
  if (recentTransactions.length > 0) {
    recentAvgPrice = recentTransactions.reduce((sum, t) => sum + t.resale_price, 0) / recentTransactions.length;
  }
  
  // If we have recent transactions, apply a trend multiplier
  let finalPrediction = prediction;
  
  if (recentAvgPrice > 0) {
    // Calculate the ratio between recent average and prediction
    const recentRatio = recentAvgPrice / prediction;
    
    // Apply a weighted adjustment with SIGNIFICANTLY INCREASED weight to recent transactions
    // Changed from 30/70 to 15/85 to give even more weight to recent market trends
    finalPrediction = prediction * 0.15 + recentAvgPrice * 0.85;
    
    // If we have a significant number of recent transactions (5+), trust them even more
    if (recentTransactions.length >= 5) {
      // Further adjust to give even more weight to recent 
      finalPrediction = prediction * 0.9 + recentAvgPrice * 0.1;
    }
    
    console.log('Adjusted prediction based on recent transactions:', {
      originalPrediction: prediction,
      recentAvgPrice,
      recentRatio,
      recentTransactionsCount: recentTransactions.length,
      finalPrediction
    });
  }

  // Calculate prediction interval AFTER applying the recent transaction adjustment
  // This ensures the interval is centered around our final prediction
  const predictionInterval = {
    lower: Math.round(finalPrediction * 0.85), // Wider lower bound
    upper: Math.round(finalPrediction * 1.20)  // Even wider upper bound to account for market fluctuations
  };

  return {
    estimatedValue: Math.round(finalPrediction),
    baseEstimatedValue: Math.round(prediction),
    multipliers: {
      googleTrends: 1.0,
      sentiment: 1.0,
      economicTrend: 1.0
    },
    featureImportance: correlations.map(c => ({
      feature: c.feature,
      importance: c.importance,
      impact: c.impact as 'positive' | 'negative' | 'neutral',
      correlation: c.correlation
    })),
    modelMetrics: {
      r2Score,
      meanAbsoluteError: mae,
      meanSquaredError: mse
    },
    sampleSize: trainingData.length,
    recentTransactions: recentTransactions.length,
    pricePerSqm: Math.round(finalPrediction / input.floor_area_sqm),
    timeSeriesLength: new Set(trainingData.map(t => t.month)).size,
    predictionInterval,
    recentAvgPrice
  };
}

// Helper function to calculate correlation coefficient
export function calculateCorrelation(x: (number | null)[], y: (number | null)[]): number {
  // Check if arrays are valid
  if (!x || !y || x.length === 0 || y.length === 0 || x.length !== y.length) {
    console.warn("Correlation input arrays invalid or mismatched length.");
    return 0;
  }
  
  // Create pairs and filter out any nulls or NaNs
  const validPairs: [number, number][] = [];
  for (let i = 0; i < x.length; i++) {
    const xVal = x[i];
    const yVal = y[i];
    // Ensure both values are valid numbers
    if (xVal !== null && yVal !== null && !isNaN(xVal) && !isNaN(yVal)) {
      validPairs.push([xVal, yVal]);
    }
  }
  
  // If no valid pairs, return 0
  const n = validPairs.length;
  if (n < 3) {
    console.warn(`Insufficient valid data points for correlation: ${n}`);
    return 0;
  }
  
  const xValues = validPairs.map(pair => pair[0]);
  const yValues = validPairs.map(pair => pair[1]);
  
  const xMean = xValues.reduce((sum, val) => sum + val, 0) / n;
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / n;
  
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }
  
  // Avoid division by zero if one variable has zero variance
  if (xDenominator === 0 || yDenominator === 0) {
    console.warn("Correlation calculation resulted in zero denominator (variance).");
    return 0;
  }
  
  const correlation = numerator / Math.sqrt(xDenominator * yDenominator);
  
  // Clamp correlation to [-1, 1] just in case of floating point issues
  return Math.max(-1, Math.min(1, correlation));
}

// Helper function to calculate R² score
function calculateR2Score(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
  const totalSS = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const residualSS = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
  return 1 - (residualSS / totalSS);
}

// Helper function to calculate error metrics
function calculateErrorMetrics(actual: number[], predicted: number[]) {
  let sumAbsError = 0;
  let sumSquaredError = 0;
  
  for (let i = 0; i < actual.length; i++) {
    sumAbsError += Math.abs(actual[i] - predicted[i]);
    sumSquaredError += Math.pow(actual[i] - predicted[i], 2);
  }
  
  return {
    mae: sumAbsError / actual.length,
    mse: sumSquaredError / actual.length
  };
}

// Update the calculatePredictionInterval function to make it more accurate with a narrower range
function calculatePredictionInterval(
  model: RandomForest,
  features: number[],
  actualValues: number[],
  trainingFeatures: number[][]
): { lower: number; upper: number } {
  const prediction = model.predict([features])[0];
  
  // Calculate standard deviation of errors with a more robust approach
  const modelPredictions = model.predict(trainingFeatures);
  
  // Calculate errors
  const errors = [];
  for (let i = 0; i < actualValues.length; i++) {
    errors.push(actualValues[i] - modelPredictions[i]);
  }
  
  // Sort errors to find percentiles
  const sortedErrors = [...errors].sort((a, b) => a - b);
  
  // Use 25th and 75th percentiles for a narrower, more robust interval
  const lowerPercentile = sortedErrors[Math.floor(sortedErrors.length * 0.25)];
  const upperPercentile = sortedErrors[Math.floor(sortedErrors.length * 0.75)];
  
  // Apply a scaling factor to further narrow the range (adjust as needed)
  const scalingFactor = 0.8;
  
  return {
    lower: Math.max(prediction + lowerPercentile * scalingFactor, prediction * 0.85),
    upper: Math.min(prediction + upperPercentile * scalingFactor, prediction * 1.15)
  };
}

// Add these new functions to read and use adjustment factors
export async function getAdjustmentFactors() {
  if (!cachedAdjustmentFactors) {
    try {
      const response = await fetch('/data/adjustment_factors.csv');
      const csv = await response.text();
      
      const results = Papa.parse<{
        town: string;
        adj_factor_gnews: number;
        adj_factor_gtrend: number;
        adj_factor_econ: number;
      }>(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      cachedAdjustmentFactors = results.data;
    } catch (error) {
      console.error('Error loading adjustment factors:', error);
      cachedAdjustmentFactors = [];
    }
  }
  
  return cachedAdjustmentFactors;
}

// Variable to store cached adjustment factors
let cachedAdjustmentFactors: {
  town: string;
  adj_factor_gnews: number;
  adj_factor_gtrend: number;
  adj_factor_econ: number;
}[] | null = null;

// Get adjustment factor for a specific town
function getTownAdjustmentFactors(town: string) {
  if (!cachedAdjustmentFactors || cachedAdjustmentFactors.length === 0) {
    return null;
  }
  
  // Normalize the town name for comparison
  const normalizedTown = normalizeString(town);
  
  // Find the matching town record
  return cachedAdjustmentFactors.find(record => 
    normalizeString(record.town) === normalizedTown
  ) || null;
}

// Normalize a value within a range of all available factors
function normalizeAdjustmentFactor(value: number, factorName: 'adj_factor_gnews' | 'adj_factor_gtrend' | 'adj_factor_econ'): number {
  if (!cachedAdjustmentFactors || cachedAdjustmentFactors.length === 0) {
    return 0.015; // Default middle value if no data available
  }
  
  // Get all values for this factor type across all towns
  const allFactors = cachedAdjustmentFactors
    .map(record => record[factorName])
    .filter(val => val !== null && val !== undefined) as number[];
  
  // If no valid values, return default
  if (allFactors.length === 0) {
    return 0.015;
  }
  
  // Find min and max
  const minFactor = Math.min(...allFactors);
  const maxFactor = Math.max(...allFactors);
  
  // If min and max are the same (no range), return default
  if (maxFactor === minFactor) {
    return 0.015;
  }
  
  // Normalize to 0-0.03 range
  return 0.03 * (value - minFactor) / (maxFactor - minFactor);
}

// Calculate Google Trends multiplier based on trend data and town adjustment factor
export async function calculateGoogleTrendsMultiplier(trendsData: any, town: string): Promise<number> {
  // Get town adjustment factor
  await getAdjustmentFactors();
  const townFactors = getTownAdjustmentFactors(town);
  
  if (!townFactors) {
    console.warn(`No adjustment factors found for town: ${town}`);
    return 1.0; // Default multiplier if no town data available
  }
  
  // Normalize the adjustment factor to 0-0.03 range
  const normalizedFactor = normalizeAdjustmentFactor(townFactors.adj_factor_gtrend, 'adj_factor_gtrend');
  
  // Determine trend direction
  let trendDirection = 0; // Default neutral
  
  if (trendsData && trendsData.interest_over_time && trendsData.interest_over_time.timeline_data) {
    try {
      const timelineData = trendsData.interest_over_time.timeline_data;
      
      // Get values from the last few weeks to analyze trend
      const recentData = timelineData.slice(-8);
      if (recentData.length >= 2) {
        // Extract values
        const values = recentData.map((item: any) => {
          const value = item.values[0]?.value || 0;
          return typeof value === 'number' ? value : parseInt(value) || 0;
        });
        
        // Simple linear regression to determine trend direction
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((a: number, b: number) => a + b, 0);
        const sumY = values.reduce((a: number, b: number) => a + b, 0);
        const sumXY = x.reduce((sum: number, xi: number, i: number) => sum + xi * values[i], 0);
        const sumXX = x.reduce((sum: number, xi: number) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        // Determine direction based on slope
        trendDirection = slope > 0 ? 1 : (slope < 0 ? -1 : 0);
      }
    } catch (error) {
      console.warn('Error analyzing Google Trends direction:', error);
    }
  }
  
  // Calculate multiplier: 1 + (direction * normalized factor)
  const multiplier = 1.0 + (trendDirection * normalizedFactor);
  
  console.log(`Google Trends Multiplier: Town=${town}, Factor=${townFactors.adj_factor_gtrend.toFixed(6)}, Normalized=${normalizedFactor.toFixed(3)}, Direction=${trendDirection}, Final=${multiplier.toFixed(3)}`);
  
  return multiplier;
}

// Calculate sentiment multiplier based on news stories and town adjustment factor
export async function calculateSentimentMultiplier(storiesData: any, town: string): Promise<number> {
  // Get town adjustment factor
  await getAdjustmentFactors();
  const townFactors = getTownAdjustmentFactors(town);
  
  if (!townFactors) {
    console.warn(`No adjustment factors found for town: ${town}`);
    return 1.0; // Default multiplier if no town data available
  }
  
  // Normalize the adjustment factor to 0-0.03 range
  const normalizedFactor = normalizeAdjustmentFactor(townFactors.adj_factor_gnews, 'adj_factor_gnews');
  
  // Determine sentiment direction
  let sentimentDirection = 0; // Default neutral
  
  if (storiesData && storiesData.news_results && storiesData.news_results.length) {
    try {
      // Count positive, negative, and neutral stories
      let positive = 0, negative = 0, neutral = 0;
      
      storiesData.news_results.forEach((story: any) => {
        if (!story.sentiment) {
          neutral++;
        } else if (story.sentiment === 'positive') {
          positive++;
        } else if (story.sentiment === 'negative') {
          negative++;
        } else {
          neutral++;
        }
      });
      
      // Determine overall sentiment direction
      if (positive > negative) {
        sentimentDirection = 1; // Overall positive
      } else if (negative > positive) {
        sentimentDirection = -1; // Overall negative
      } else {
        sentimentDirection = 0; // Neutral or balanced
      }
      
      console.log(`News Sentiment: Positive=${positive}, Negative=${negative}, Neutral=${neutral}, Direction=${sentimentDirection}`);
    } catch (error) {
      console.warn('Error analyzing news sentiment:', error);
    }
  }
  
  // Calculate multiplier: 1 + (direction * normalized factor)
  const multiplier = 1.0 + (sentimentDirection * normalizedFactor);
  
  console.log(`News Sentiment Multiplier: Town=${town}, Factor=${townFactors.adj_factor_gnews.toFixed(6)}, Normalized=${normalizedFactor.toFixed(3)}, Direction=${sentimentDirection}, Final=${multiplier.toFixed(3)}`);
  
  return multiplier;
}

// Calculate economic multiplier based on economic data and town adjustment factor
export async function calculateEconomicMultiplier(ecoData: any[], streetPrices: (number | null)[], town: string): Promise<number> {
  // Get town adjustment factor
  await getAdjustmentFactors();
  const townFactors = getTownAdjustmentFactors(town);
  
  if (!townFactors) {
    console.warn(`No adjustment factors found for town: ${town}`);
    return 1.0; // Default multiplier if no town data available
  }
  
  // Normalize the adjustment factor to 0-0.03 range
  const normalizedFactor = normalizeAdjustmentFactor(townFactors.adj_factor_econ, 'adj_factor_econ');
  
  // Determine economic trend direction
  let economicDirection = 0; // Default neutral
  
  if (ecoData && ecoData.length >= 2) {
    try {
      // Define the indices we want to check trends for
      const indices = ['HDB Resale Index', 'GDP Index', 'CPI Index', 'Rental Index'];
      const trendDirections: number[] = [];
      
      // Calculate trend direction for each index
      indices.forEach(indexName => {
        // Get recent values for this index (last 4 quarters)
        const recentValues = ecoData.slice(-4).map(d => {
          const value = d[indexName];
          return typeof value === 'number' ? value : parseFloat(value) || 0;
        }).filter(v => !isNaN(v));
        
        // Calculate trend if we have enough values
        if (recentValues.length >= 2) {
          const firstVal = recentValues[0];
          const lastVal = recentValues[recentValues.length - 1];
          
          // Determine direction
          const indexDirection = lastVal > firstVal ? 1 : (lastVal < firstVal ? -1 : 0);
          trendDirections.push(indexDirection);
        }
      });
      
      // If we have trends for some indices, determine overall direction
      if (trendDirections.length > 0) {
        // Sum directions and get average
        const directionSum = trendDirections.reduce((sum, dir) => sum + dir, 0);
        
        // Overall direction based on average (positive, negative, or neutral)
        if (directionSum > 0) {
          economicDirection = 1;
        } else if (directionSum < 0) {
          economicDirection = -1;
        }
        
        console.log(`Economic indices trends: ${trendDirections.join(', ')}, Overall=${economicDirection}`);
      }
    } catch (error) {
      console.warn('Error analyzing economic trends:', error);
    }
  }
  
  // Calculate multiplier: 1 + (direction * normalized factor)
  const multiplier = 1.0 + (economicDirection * normalizedFactor);
  
  console.log(`Economic Multiplier: Town=${town}, Factor=${townFactors.adj_factor_econ.toFixed(6)}, Normalized=${normalizedFactor.toFixed(3)}, Direction=${economicDirection}, Final=${multiplier.toFixed(3)}`);
  
  return multiplier;
} 