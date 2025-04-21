import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction } from '@/app/services/hdbData';
import { TrendingUp, TrendingDown, Building2, DollarSign, Calendar, Sparkles, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Papa from 'papaparse';
import { useTheme } from 'next-themes';

interface PropertyAnalyticsProps {
  transactions: Transaction[];
  streetName: string;
  flatType?: string;
}

// Helper function to normalize street name (copied from hdbData.ts)
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

// Helper function to normalize string (copied from hdbData.ts)
function normalizeString(str: string): string {
  return str.trim().toUpperCase();
}

const PropertyAnalytics: React.FC<PropertyAnalyticsProps> = ({ transactions, streetName, flatType }) => {
  const [showForecast, setShowForecast] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(transactions);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState(12); // Default to 1 year (12 months)
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const animationRef = useRef<number | null>(null);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [timelineLabels, setTimelineLabels] = useState<string[]>([]);
  const [isComparisonLoading, setIsComparisonLoading] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // Define a theme object for charts that works in both light and dark modes
  const chartTheme = {
    axis: {
      ticks: {
        text: {
          fill: isDark ? '#e2e8f0' : '#334155',
        },
      },
      legend: {
        text: {
          fill: isDark ? '#e2e8f0' : '#334155',
        },
      },
      domain: {
        line: {
          stroke: isDark ? '#475569' : '#cbd5e1',
        },
      },
    },
    grid: {
      line: {
        stroke: isDark ? '#2d3748' : '#e2e8f0',
      },
    },
    tooltip: {
      container: {
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#334155',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        borderRadius: '4px',
        padding: '8px 12px',
      },
    },
    legends: {
      text: {
        fill: isDark ? '#e2e8f0' : '#334155',
      },
    },
    labels: {
      text: {
        fill: isDark ? '#e2e8f0' : '#334155',
      },
    },
    dots: {
      text: {
        fill: isDark ? '#e2e8f0' : '#334155',
      },
    },
    // Specific theme for pie chart
    pie: {
      labels: {
        text: {
          fill: '#000000',
        },
      },
      legends: {
        text: {
          fill: '#000000',
        },
      },
      arcLabels: {
        text: {
          fill: '#000000',
        },
      },
      arcLinkLabels: {
        text: {
          fill: '#000000',
        },
      },
    },
  };
  
  // Define a specific theme for the pie chart with black text
  const pieChartTheme = {
    ...chartTheme,
    labels: {
      text: {
        fill: '#000000',
      }
    },
    legends: {
      text: {
        fill: '#000000',
      }
    },
    arcLabels: {
      text: {
        fill: '#000000',
      }
    },
    arcLinkLabels: {
      text: {
        fill: '#000000',
      }
    }
  };
  
  // Modify the main useEffect to handle all loading at once
  useEffect(() => {
    async function loadAllData() {
      setIsLoading(true);
      try {
        console.log("Fetching transactions for:", streetName, flatType);
        
        // Extract just the street name from the full address if needed
        let processedStreetName = streetName;
        
        // Remove block number if present (usually at the beginning)
        const blockMatch = processedStreetName.match(/^\d+[A-Z]?\s+(.+?)(?:\s+SINGAPORE.*)?$/i);
        if (blockMatch && blockMatch[1]) {
          processedStreetName = blockMatch[1];
          console.log("Extracted street name:", processedStreetName);
        }
        
        // Remove postal code if present (usually at the end)
        processedStreetName = processedStreetName.replace(/\s+\d{6}$/, '');
        
        // Remove "SINGAPORE" if present
        processedStreetName = processedStreetName.replace(/\s+SINGAPORE\s*/, ' ');
        
        // Fetch and parse CSV if needed
        let cachedData: Transaction[] | null = null;
        const response = await fetch('/data/hdb_resale.csv');
        const csv = await response.text();
        
        const results = Papa.parse<Transaction>(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        cachedData = results.data.reverse();
        
        console.log("Total transactions in CSV:", cachedData.length);
        
        // Filter transactions by street name and flat type
        const normalizedInputStreet = normalizeStreetName(processedStreetName);
        const normalizedFlatType = flatType ? normalizeString(flatType) : '';
        
        console.log("Normalized street name:", normalizedInputStreet);
        console.log("Normalized flat type:", normalizedFlatType);
        
        // Get relevant transactions (same street and flat type)
        const relevantTransactions = cachedData.filter(t => {
          const normalizedCsvStreet = normalizeStreetName(t.street_name || '');
          const normalizedCsvFlatType = normalizeString(t.flat_type || '');
          
          const streetMatch = normalizedCsvStreet === normalizedInputStreet;
          const typeMatch = !flatType || normalizedCsvFlatType === normalizedFlatType;
          
          return streetMatch && typeMatch;
        });

        console.log("Relevant transactions found:", relevantTransactions.length);

        // If we don't have enough data for this specific street, expand to the town level
        let finalTransactions = relevantTransactions;
        if (relevantTransactions.length < 30 && flatType) {
          console.log("Not enough transactions, expanding to town level");
          
          // Find the town based on the street name
          const streetTransaction = cachedData.find(t => 
            normalizeStreetName(t.street_name || '') === normalizedInputStreet
          );

          if (streetTransaction?.town) {
            const town = streetTransaction.town;
            console.log("Found town:", town);
            
            // Get transactions from the same town and flat type
            finalTransactions = cachedData.filter(t => 
              normalizeString(t.town || '') === normalizeString(town) &&
              normalizeString(t.flat_type || '') === normalizedFlatType
            );
            
            console.log("Town-level transactions found:", finalTransactions.length);
          }
        }
        
        // If we still don't have transactions, try a more flexible street name match
        if (finalTransactions.length === 0) {
          console.log("No transactions found, trying partial street name match");
          
          // Try to match just part of the street name
          const streetParts = normalizedInputStreet.split(/\s+/);
          if (streetParts.length > 1) {
            // Try matching with the main part of the street name (e.g., "ANCHORVALE" from "ANCHORVALE ROAD")
            const mainStreetPart = streetParts[0];
            console.log("Trying to match with main street part:", mainStreetPart);
            
            finalTransactions = cachedData.filter(t => {
              const normalizedCsvStreet = normalizeStreetName(t.street_name || '');
              const normalizedCsvFlatType = normalizeString(t.flat_type || '');
              
              const streetMatch = normalizedCsvStreet.includes(mainStreetPart);
              const typeMatch = !flatType || normalizedCsvFlatType === normalizedFlatType;
              
              return streetMatch && typeMatch;
            });
            
            console.log("Partial street match transactions found:", finalTransactions.length);
          }
        }
        
        // Last resort: if we still have no transactions, just use the most recent ones with the same flat type
        if (finalTransactions.length === 0 && flatType) {
          console.log("Still no transactions found, using recent transactions with same flat type");
          
          const normalizedFlatType = normalizeString(flatType);
          finalTransactions = cachedData
            .filter(t => normalizeString(t.flat_type || '') === normalizedFlatType)
            .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
            .slice(0, 100);
            
          console.log("Recent transactions with same flat type:", finalTransactions.length);
        }
        
        console.log("Final transactions count:", finalTransactions.length);
        setAllTransactions(finalTransactions);

        // Now prepare the comparison data while still in loading state
        if (finalTransactions.length > 0) {
          await prepareComparisonData(finalTransactions, cachedData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
        setIsComparisonLoading(false);
      }
    }

    async function prepareComparisonData(transactions: Transaction[], allCsvTransactions: Transaction[]) {
      try {
        // Get the current town from one of the transactions
        const currentTown = transactions[0]?.town;
        if (!currentTown) return;
        
        // Filter to just get transactions from the same town
        const townTransactions = allCsvTransactions.filter(t => 
          normalizeString(t.town || '') === normalizeString(currentTown)
        );
        
        // Get the 5 most frequently transacted street names in this town (excluding current street)
        const streetNameCounts: Record<string, number> = {};
        townTransactions.forEach(t => {
          const street = normalizeStreetName(t.street_name || '');
          if (street && street !== normalizeStreetName(streetName)) {
            streetNameCounts[street] = (streetNameCounts[street] || 0) + 1;
          }
        });
        
        // Sort and get top 5 most popular streets
        const popularStreets = Object.entries(streetNameCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([street]) => street);
        
        console.log("Top 5 popular streets:", popularStreets);
        
        // Generate time periods from 2017 to 2025 in 3-month intervals
        const timelinePeriods: string[] = [];
        const startYear = 2017;
        const endYear = 2025;
        
        for (let year = startYear; year <= endYear; year++) {
          for (let quarter = 1; quarter <= 4; quarter++) {
            const startMonth = (quarter - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            
            // Format as "Jan-Mar 2017", "Apr-Jun 2017", etc.
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const periodLabel = `${monthNames[startMonth-1]}-${monthNames[endMonth-1]} ${year}`;
            
            timelinePeriods.push(periodLabel);
          }
        }
        
        setTimelineLabels(timelinePeriods);
        
        // Calculate average prices for each street by time period
        const raceChartData: Record<string, any[]> = {};
        
        // Initialize with current street
        raceChartData[normalizeStreetName(streetName)] = [];
        
        // Add popular streets
        popularStreets.forEach(street => {
          raceChartData[street] = [];
        });
        
        // Get a consistent color for each street
        const streetColors: Record<string, string> = {
          [normalizeStreetName(streetName)]: "#2563EB" // Current street is always blue
        };
        
        // Assign colors to other streets
        popularStreets.forEach((street, index) => {
          // Fixed set of colors for better visual consistency
          const colors = [
            "hsl(340, 70%, 50%)", // Red
            "hsl(120, 70%, 50%)", // Green
            "hsl(45, 70%, 50%)",  // Yellow
            "hsl(275, 70%, 50%)", // Purple
            "hsl(200, 70%, 50%)"  // Light blue
          ];
          streetColors[street] = colors[index % colors.length];
        });
        
        // Function to get transactions for a specific period
        const getTransactionsForPeriod = (
          transactions: Transaction[], 
          year: number, 
          startMonth: number, 
          endMonth: number
        ) => {
          return transactions.filter(t => {
            if (!t.transaction_date) return false;
            try {
              const transactionDate = new Date(t.transaction_date);
              return (
                transactionDate.getFullYear() === year &&
                transactionDate.getMonth() + 1 >= startMonth &&
                transactionDate.getMonth() + 1 <= endMonth
              );
            } catch (e) {
              return false;
            }
          });
        };
        
        // Function to get transactions by year and month (from month field)
        const getTransactionsByYearMonth = (
          transactions: Transaction[],
          year: number,
          startMonth: number,
          endMonth: number
        ) => {
          return transactions.filter(t => {
            if (!t.month) return false;
            
            const [tYear, tMonth] = t.month.split('-').map(Number);
            return (
              tYear === year &&
              tMonth >= startMonth &&
              tMonth <= endMonth
            );
          });
        };
        
        // Calculate initial values for each street across all time periods
        // This ensures we have realistic starting values for animations
        const initialPrices: Record<string, number> = {};
        
        // For current street
        const currentStreetKey = normalizeStreetName(streetName);
        const currentStreetInitialPrice = 
          transactions.length > 0 
          ? Math.round(transactions.reduce((sum, t) => sum + t.resale_price, 0) / transactions.length)
          : 500000; // Fallback value if no data
        initialPrices[currentStreetKey] = currentStreetInitialPrice;
        
        // For other streets
        for (const street of popularStreets) {
          const streetTransactions = townTransactions.filter(
            t => normalizeStreetName(t.street_name || '') === street
          );
          
          const avgPrice = streetTransactions.length > 0
            ? Math.round(streetTransactions.reduce((sum, t) => sum + t.resale_price, 0) / streetTransactions.length)
            : 500000; // Fallback value
          
          initialPrices[street] = avgPrice;
        }
        
        // Generate data for each time period
        for (const period of timelinePeriods) {
          const [monthRange, yearStr] = period.split(' ');
          const year = parseInt(yearStr);
          
          // Parse month range to get start and end months
          const [startMonthStr, endMonthStr] = monthRange.split('-');
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const startMonth = monthNames.indexOf(startMonthStr) + 1;
          const endMonth = monthNames.indexOf(endMonthStr) + 1;
          
          // For each street, calculate average price
          for (const street of [currentStreetKey, ...popularStreets]) {
            // Get transactions for this period
            let streetTransactions;
            
            if (street === currentStreetKey) {
              // For current street, use our filtered transactions
              streetTransactions = getTransactionsForPeriod(transactions, year, startMonth, endMonth);
              
              // If we don't have data from transaction_date, try the month field
              if (streetTransactions.length === 0) {
                streetTransactions = getTransactionsByYearMonth(transactions, year, startMonth, endMonth);
              }
            } else {
              // For other streets, filter from town transactions
              const streetTownTransactions = townTransactions.filter(
                t => normalizeStreetName(t.street_name || '') === street
              );
              
              streetTransactions = getTransactionsForPeriod(streetTownTransactions, year, startMonth, endMonth);
              
              // If we don't have data from transaction_date, try the month field
              if (streetTransactions.length === 0) {
                streetTransactions = getTransactionsByYearMonth(streetTownTransactions, year, startMonth, endMonth);
              }
            }
            
            let avgPrice = 0;
            
            if (streetTransactions.length > 0) {
              // Calculate average from actual transactions
              avgPrice = Math.round(
                streetTransactions.reduce((sum, t) => sum + t.resale_price, 0) / streetTransactions.length
              );
            } else {
              // If no data for this period, use previous period's value
              const previousPeriodData = raceChartData[street][raceChartData[street].length - 1];
              
              if (previousPeriodData) {
                // Use previous value with a small random adjustment
                const prevValue = previousPeriodData.value;
                const randomAdjustment = (Math.random() * 0.05) - 0.025; // ±2.5%
                avgPrice = Math.round(prevValue * (1 + randomAdjustment));
              } else {
                // For the first period with no data, use the initial average
                avgPrice = initialPrices[street];
              }
            }
            
            // Add data point for this period
            raceChartData[street].push({
              period,
              value: avgPrice,
              street,
              transactions: streetTransactions.length,
              color: streetColors[street]
            });
          }
        }
        
        // Combine all data into a format suitable for the race bar chart
        const combinedData: any[] = [];
        let periodIndex = 0;
        
        for (const period of timelinePeriods) {
          const periodData = {
            period,
            periodIndex,
            data: Object.keys(raceChartData).map(street => ({
              street,
              value: raceChartData[street][periodIndex]?.value || initialPrices[street],
              transactions: raceChartData[street][periodIndex]?.transactions || 0,
              color: streetColors[street],
              label: street === normalizeStreetName(streetName) ? "Current Property" : formatStreetName(street)
            }))
          };
          
          // Sort data by value (descending)
          periodData.data.sort((a, b) => b.value - a.value);
          
          combinedData.push(periodData);
          periodIndex++;
        }
        
        setComparisonData(combinedData);
      } catch (error) {
        console.error("Error preparing comparison data:", error);
      }
    }
    
    loadAllData();
  }, [streetName, flatType]);

  // Remove the separate comparison data loading useEffect
  // Keep only the animation effect for the race bar chart

  // Modify the animation timer to slow it down
  useEffect(() => {
    if (isAnimating && comparisonData.length > 0) {
      const animate = () => {
        setCurrentTimeIndex(prev => {
          const next = prev + 1;
          if (next >= comparisonData.length) {
            setIsAnimating(false);
            return 0;
          }
          return next;
        });
      };
      
      const timer = setTimeout(() => {
        animate();
      }, 1700); // Slowed down to 1.7 seconds per frame (from 1 second)
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isAnimating, comparisonData, currentTimeIndex]);

  // Use all transactions for counting to match the valuation count
  const totalTransactions = allTransactions.length;
  
  // Sort transactions by date for time-based analysis
  const sortedTransactions = [...allTransactions].sort(
    (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  );

  // Calculate price trends by month
  const priceByMonth = sortedTransactions.reduce((acc, transaction) => {
    const month = transaction.month || 'Unknown';
    if (!acc[month]) {
      acc[month] = {
        prices: [],
        count: 0,
        total: 0
      };
    }
    
    acc[month].prices.push(transaction.resale_price);
    acc[month].count += 1;
    acc[month].total += transaction.resale_price;
    
    return acc;
  }, {} as Record<string, { prices: number[], count: number, total: number }>);

  // Create line chart data for price trends
  const priceTrendData = Object.entries(priceByMonth)
    .map(([month, data]) => ({
      x: formatMonth(month),
      y: Math.round(data.total / data.count)
    }))
    .sort((a, b) => {
      // Sort by date (assuming format is MMM YYYY)
      const dateA = new Date(a.x);
      const dateB = new Date(b.x);
      return dateA.getTime() - dateB.getTime();
    });

  // Generate forecast data when requested
  const generateForecast = () => {
    if (priceTrendData.length < 2) return [];
    
    // Simple linear regression for forecasting
    const n = priceTrendData.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = priceTrendData.map(d => d.y);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0);
    const sumXX = xValues.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate next 6 months forecast
    const lastDate = new Date(priceTrendData[priceTrendData.length - 1].x);
    const forecastData = [];
    
    for (let i = 1; i <= 6; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      const forecastValue = intercept + slope * (n + i - 1);
      forecastData.push({
        x: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        y: Math.round(forecastValue)
      });
    }
    
    return forecastData;
  };

  // Calculate price per sqm distribution
  const pricePerSqmData = sortedTransactions.map(transaction => ({
    block: transaction.block,
    pricePerSqm: Math.round(transaction.resale_price / transaction.floor_area_sqm)
  }));

  // Group by storey range
  const priceByStorey = sortedTransactions.reduce((acc, transaction) => {
    const storeyRange = transaction.storey_range || 'Unknown';
    if (!acc[storeyRange]) {
      acc[storeyRange] = {
        prices: [],
        count: 0,
        total: 0
      };
    }
    
    acc[storeyRange].prices.push(transaction.resale_price);
    acc[storeyRange].count += 1;
    acc[storeyRange].total += transaction.resale_price;
    
    return acc;
  }, {} as Record<string, { prices: number[], count: number, total: number }>);

  // Create bar chart data for storey analysis
  const storeyAnalysisData = Object.entries(priceByStorey)
    .map(([storeyRange, data]) => ({
      storeyRange,
      averagePrice: Math.round(data.total / data.count),
      count: data.count
    }))
    .sort((a, b) => {
      // Custom sort to ensure 'Low' floors are on the left, followed by 'Mid' then 'High'
      const getStoreyLevel = (range: string) => {
        const match = range.match(/(\d+)\s+TO\s+(\d+)/i);
        if (match) {
          const lowerFloor = parseInt(match[1]);
          // Categorize floors: 01-05 as Low, 06-15 as Mid, 16+ as High
          if (lowerFloor <= 5) return 1; // Low
          if (lowerFloor <= 15) return 2; // Mid
          return 3; // High
        }
        return 999; // Unknown or special cases
      };
      return getStoreyLevel(a.storeyRange) - getStoreyLevel(b.storeyRange);
    });

  // Calculate market statistics
  const marketStats = allTransactions.length > 0 ? {
    averagePrice: Math.round(
      allTransactions.reduce((sum, t) => sum + t.resale_price, 0) / allTransactions.length
    ),
    medianPrice: calculateMedian(allTransactions.map(t => t.resale_price)),
    averagePricePerSqm: Math.round(
      allTransactions.reduce((sum, t) => sum + (t.resale_price / t.floor_area_sqm), 0) / allTransactions.length
    ),
    recentMonthChange: calculateRecentMonthChange(priceTrendData)
  } : {
    averagePrice: 0,
    medianPrice: 0,
    averagePricePerSqm: 0,
    recentMonthChange: 0
  };

  // Calculate transaction volume by month for pie chart
  const transactionVolume = (() => {
    // Get transactions from the past 6 months from today
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    console.log(`Calculating transaction volume from ${sixMonthsAgo.toISOString()} to ${now.toISOString()}`);
    
    // First try to group by month directly from the data
    const volumeByMonth: Record<string, { count: number, month: string }> = {};
    
    // Process all transactions to ensure we don't miss any
    for (const transaction of sortedTransactions) {
      let monthKey;
      
      // Try to get month from transaction_date
      if (transaction.transaction_date) {
        try {
          const date = new Date(transaction.transaction_date);
          if (!isNaN(date.getTime())) {
            monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // If we couldn't get month from transaction_date, try the month property
      if (!monthKey && transaction.month) {
        monthKey = transaction.month;
      }
      
      // If we have a valid month key, add to the count
      if (monthKey) {
        if (!volumeByMonth[monthKey]) {
          volumeByMonth[monthKey] = {
            count: 0,
            month: monthKey
          };
        }
        volumeByMonth[monthKey].count += 1;
      }
    }
    
    console.log("Volume by month data:", volumeByMonth);
    
    // Convert to array and format for pie chart
    const result = Object.values(volumeByMonth)
      .map(({ month, count }) => ({
        id: formatMonth(month),
        label: formatMonth(month),
        value: count,
        rawMonth: month // Keep the raw month for sorting
      }))
      .sort((a, b) => {
        // Try to parse as dates first
        try {
          // For YYYY-MM format
          if (a.rawMonth.includes('-') && b.rawMonth.includes('-')) {
            return b.rawMonth.localeCompare(a.rawMonth); // Most recent first
          }
          
          // For "Month YYYY" format, convert to Date objects
          const dateA = new Date(a.id);
          const dateB = new Date(b.id);
          
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return dateB.getTime() - dateA.getTime();
          }
        } catch (e) {
          // Fallback to string comparison
        }
        
        // Fallback to string comparison
        return b.id.localeCompare(a.id);
      })
      .slice(0, 6); // Take the 6 most recent months
    
    console.log("Final transaction volume data:", result);
    return result;
  })();

  // Prepare chart data for price trends with forecast
  const forecastData = showForecast ? generateForecast() : [];
  
  // Filter price trend data based on selected time frame
  const filteredPriceTrendData = (() => {
    if (priceTrendData.length <= timeFrame) return priceTrendData;
    
    return priceTrendData.slice(priceTrendData.length - timeFrame);
  })();
  
  const chartData = [
    {
      id: "Average Price",
      data: filteredPriceTrendData
    },
    ...(showForecast ? [{
      id: "Forecast",
      data: [
        // Include the last historical data point to connect the lines
        ...(filteredPriceTrendData.length > 0 ? [filteredPriceTrendData[filteredPriceTrendData.length - 1]] : []),
        ...forecastData
      ],
      dashed: true
    }] : [])
  ];

  // Calculate lease decay data for analysis
  const leaseDecayData = (() => {
    // Process all transactions to calculate remaining lease and price per sqm
    return allTransactions
      .filter(t => {
        // Filter out transactions without necessary data
        return t.resale_price && 
               t.floor_area_sqm && 
               t.lease_commence_date && 
               !isNaN(Number(t.lease_commence_date));
      })
      .map(t => {
        // Calculate remaining lease
        const leaseStartYear = Number(t.lease_commence_date);
        const currentYear = new Date().getFullYear();
        const leaseYearsPassed = currentYear - leaseStartYear;
        const remainingLease = Math.max(0, 99 - leaseYearsPassed); // Assuming 99-year lease
        
        // Calculate price per square meter
        const pricePerSqm = t.resale_price / t.floor_area_sqm;
        
        return {
          id: `transaction-${Math.random().toString(36).substr(2, 9)}`,
          remainingLease,
          pricePerSqm: Math.round(pricePerSqm),
          price: t.resale_price,
          floorArea: t.floor_area_sqm,
          block: t.block,
          leaseCommenceDate: t.lease_commence_date,
          transactionDate: t.transaction_date
        };
      })
      .sort((a, b) => a.remainingLease - b.remainingLease); // Sort by remaining lease (ascending)
  })();
  
  // Calculate average price per sqm by remaining lease years (grouped)
  const leaseDecayAverages = (() => {
    // Group transactions by remaining lease in 5-year bands
    const leaseBands: Record<string, { total: number, count: number, min: number, max: number }> = {};
    
    for (const item of leaseDecayData) {
      // Create 5-year bands (e.g., 60-64, 65-69, etc.)
      const bandStart = Math.floor(item.remainingLease / 5) * 5;
      const bandEnd = bandStart + 4;
      const bandKey = `${bandStart}-${bandEnd}`;
      
      if (!leaseBands[bandKey]) {
        leaseBands[bandKey] = { 
          total: 0, 
          count: 0, 
          min: item.pricePerSqm, 
          max: item.pricePerSqm 
        };
      }
      
      leaseBands[bandKey].total += item.pricePerSqm;
      leaseBands[bandKey].count += 1;
      leaseBands[bandKey].min = Math.min(leaseBands[bandKey].min, item.pricePerSqm);
      leaseBands[bandKey].max = Math.max(leaseBands[bandKey].max, item.pricePerSqm);
    }
    
    // Convert to array format for chart
    return Object.entries(leaseBands)
      .map(([band, data]) => {
        const [start, end] = band.split('-').map(Number);
        return {
          band,
          remainingLease: (start + end) / 2, // Use midpoint for x-axis
          averagePricePerSqm: Math.round(data.total / data.count),
          count: data.count,
          minPrice: data.min,
          maxPrice: data.max
        };
      })
      .sort((a, b) => a.remainingLease - b.remainingLease); // Sort by remaining lease (ascending)
  })();
  
  // Calculate linear regression for lease decay trend line
  const leaseDecayTrendLine = (() => {
    if (leaseDecayAverages.length < 2) return [];
    
    const n = leaseDecayAverages.length;
    const xValues = leaseDecayAverages.map(d => d.remainingLease);
    const yValues = leaseDecayAverages.map(d => d.averagePricePerSqm);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0);
    const sumXX = xValues.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate trend line points
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    
    return [
      { x: minX, y: intercept + slope * minX },
      { x: maxX, y: intercept + slope * maxX }
    ];
  })();

  // Helper function to format street names for display
  const formatStreetName = (street: string) => {
    return street
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div 
      className="space-y-8"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium">Loading transaction data...</p>
          <p className="text-sm text-muted-foreground">This may take a moment as we analyze all relevant transactions</p>
        </div>
      ) : allTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Transaction Data Available</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn't find any transaction data for {flatType || ''} flats at {streetName}.
            This could be because there haven't been any recent transactions for this property type in this area.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold">
            Market Analytics for {flatType || ''} Flats at {streetName}
          </h2>
          
          {/* Market Overview Cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Average Price</h3>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mb-1">
                ${marketStats.averagePrice.toLocaleString()}
              </div>
              <div className="flex items-center text-sm">
                {marketStats.recentMonthChange > 0 ? (
                  <div className="flex items-center text-green-500">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+{marketStats.recentMonthChange.toFixed(1)}% from previous month</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    <span>{marketStats.recentMonthChange.toFixed(1)}% from previous month</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Median Price</h3>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mb-1">
                ${marketStats.medianPrice.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Based on {totalTransactions} transactions
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Price per SQM</h3>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mb-1">
                ${marketStats.averagePricePerSqm.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Average price per square meter
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {totalTransactions}
              </div>
              <div className="text-sm text-muted-foreground">
                Total transactions analyzed
              </div>
            </Card>
          </div>

          {/* Price Trend Chart with Tabs */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Market Price Analysis</CardTitle>
                    <CardDescription>
                      Comprehensive price trend analysis and comparisons
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="price-trends">
                  <TabsList className="mb-4">
                    <TabsTrigger value="price-trends">Price Trends Over Time</TabsTrigger>
                    <TabsTrigger value="comparison">Area Comparison</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="price-trends">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <button 
                          className={`px-3 py-1 text-sm ${timeFrame === 6 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                          onClick={() => setTimeFrame(6)}
                        >
                          6M
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm ${timeFrame === 12 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                          onClick={() => setTimeFrame(12)}
                        >
                          1Y
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm ${timeFrame === 24 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                          onClick={() => setTimeFrame(24)}
                        >
                          2Y
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm ${timeFrame === 36 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                          onClick={() => setTimeFrame(36)}
                        >
                          3Y
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm ${timeFrame === 60 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                          onClick={() => setTimeFrame(60)}
                        >
                          5Y
                        </button>
                        <button 
                          className={`px-3 py-1 text-sm ${timeFrame === 999 ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                          onClick={() => setTimeFrame(999)}
                        >
                          All
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForecast(!showForecast)}
                        className="flex items-center gap-1"
                      >
                        <Sparkles className="h-4 w-4" />
                        {showForecast ? 'Hide Forecast' : 'Predict Future Prices'}
                      </Button>
                    </div>
                    <div className="h-[400px]">
                      <ResponsiveLine
                        data={chartData}
                        margin={{ top: 50, right: 110, bottom: 70, left: 80 }}
                        xScale={{ type: 'point' }}
                        yScale={{ 
                          type: 'linear',
                          min: 'auto',
                          max: 'auto',
                          stacked: false,
                          reverse: false
                        }}
                        yFormat=" >-$.2f"
                        curve="monotoneX"
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                          tickSize: 5,
                          tickPadding: 10,
                          tickRotation: -45,
                          legend: '',
                          legendOffset: 50,
                          legendPosition: 'middle'
                        }}
                        axisLeft={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: '',
                          legendOffset: -60,
                          legendPosition: 'middle',
                          format: value => `$${(value as number).toLocaleString()}`
                        }}
                        enableGridX={false}
                        pointSize={10}
                        pointColor="#ffffff"
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'serieColor' }}
                        enableArea={true}
                        areaOpacity={0.15}
                        useMesh={true}
                        enableSlices="x"
                        colors={{ scheme: 'category10' }}
                        legends={[
                          {
                            anchor: 'bottom-right',
                            direction: 'column',
                            justify: false,
                            translateX: 100,
                            translateY: 0,
                            itemsSpacing: 0,
                            itemDirection: 'left-to-right',
                            itemWidth: 80,
                            itemHeight: 20,
                            itemOpacity: 0.75,
                            symbolSize: 12,
                            symbolShape: 'circle',
                            symbolBorderColor: 'rgba(255, 255, 255, 0.3)',
                            effects: [
                              {
                                on: 'hover',
                                style: {
                                  itemBackground: 'rgba(255, 255, 255, 0.05)',
                                  itemOpacity: 1
                                }
                              }
                            ]
                          }
                        ]}
                        theme={chartTheme}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="comparison">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm font-medium">
                        {comparisonData.length > 0 && currentTimeIndex < comparisonData.length && (
                          <span className="text-lg text-primary">{comparisonData[currentTimeIndex].period}</span>
                        )} - Average Resale Prices
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentTimeIndex(0);
                            setIsAnimating(false);
                          }}
                          className="flex items-center gap-1"
                          disabled={isComparisonLoading || currentTimeIndex === 0}
                        >
                          <span className="text-xs">Reset</span>
                        </Button>
                        <Button
                          variant={isAnimating ? "secondary" : "default"}
                          size="sm"
                          onClick={() => setIsAnimating(!isAnimating)}
                          className="flex items-center gap-1 min-w-[80px]"
                          disabled={isComparisonLoading}
                        >
                          {isAnimating ? (
                            <>
                              <Pause className="h-4 w-4" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              <span>Play</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="h-[400px] relative">
                      {isComparisonLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-4"></div>
                          <p className="text-lg font-medium">Preparing comparison data...</p>
                          <p className="text-sm text-muted-foreground">Analyzing property trends across different areas</p>
                        </div>
                      ) : comparisonData.length > 0 && currentTimeIndex < comparisonData.length ? (
                        <>
                          <div className="absolute top-4 right-4 bg-white dark:bg-gray-900 p-2 shadow-sm rounded-md border z-10">
                            <div className="text-xs text-muted-foreground mb-1">Current Period</div>
                            <div className="text-sm font-bold">{comparisonData[currentTimeIndex].period}</div>
                          </div>
                          <ResponsiveBar
                            data={comparisonData[currentTimeIndex].data.slice(0, 6)}
                            keys={['value']}
                            indexBy="label"
                            margin={{ top: 50, right: 150, bottom: 50, left: 130 }}
                            padding={0.4}
                            layout="horizontal"
                            valueScale={{ type: 'linear' }}
                            indexScale={{ type: 'band', round: true }}
                            valueFormat={value => `$${(value as number).toLocaleString()}`}
                            colors={({ data }) => data.color as string}
                            borderRadius={4}
                            borderWidth={1}
                            borderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: 'Average Resale Price (SGD)',
                              legendPosition: 'middle',
                              legendOffset: 40,
                              format: value => `$${(value as number / 1000).toLocaleString()}k`
                            }}
                            axisLeft={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                            }}
                            enableGridX={true}
                            gridXValues={5}
                            enableGridY={false}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{ from: 'color', modifiers: [['darker', 2.2]] }}
                            isInteractive={true}
                            motionConfig="gentle"
                            role="application"
                            ariaLabel="Property price comparison by street"
                            barAriaLabel={e => `${e.formattedValue} for ${e.indexValue}`}
                            theme={chartTheme}
                          />
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No comparison data available</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Timeline slider with improved styling */}
                    <div className="mt-6 px-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">Timeline</span>
                        <span className="text-xs font-medium">
                          {comparisonData.length > 0 && currentTimeIndex < comparisonData.length
                            ? `${currentTimeIndex + 1} of ${comparisonData.length}`
                            : ''}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={comparisonData.length - 1}
                        value={currentTimeIndex}
                        onChange={e => {
                          setCurrentTimeIndex(parseInt(e.target.value));
                          if (isAnimating) setIsAnimating(false);
                        }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
                        disabled={isComparisonLoading}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>2017</span>
                        <span>2019</span>
                        <span>2021</span>
                        <span>2023</span>
                        <span>2025</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Storey Analysis Chart */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Price by Storey Range</CardTitle>
                <CardDescription>
                  How floor level affects resale prices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveBar
                    data={storeyAnalysisData}
                    keys={['averagePrice']}
                    indexBy="storeyRange"
                    margin={{ top: 50, right: 50, bottom: 50, left: 80 }}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={{ scheme: 'reds' }}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: 'Storey Range',
                      legendPosition: 'middle',
                      legendOffset: 32
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: '',
                      legendPosition: 'middle',
                      legendOffset: -60,
                      format: value => `$${(value as number).toLocaleString()}`
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelFormat={value => `$${(value as number).toLocaleString()}`}
                    tooltip={({ data }) => (
                      <div className="bg-white dark:bg-gray-900 p-2 shadow-md rounded-md border dark:border-gray-700">
                        <strong>{data.storeyRange}</strong>
                        <div>Average Price: ${data.averagePrice.toLocaleString()}</div>
                        <div>Transactions: {data.count}</div>
                      </div>
                    )}
                    theme={chartTheme}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Transaction Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume</CardTitle>
                <CardDescription>
                  Past 6 months transaction volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {transactionVolume.length > 0 ? (
                    <ResponsivePie
                      data={transactionVolume}
                      margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      borderWidth={1}
                      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor="#000000"
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      arcLabelsSkipAngle={10}
                      arcLabelsTextColor="#000000"
                      colors={{ scheme: 'pastel1' }}
                      tooltip={({ datum }) => (
                        <div className="bg-white dark:bg-gray-900 p-2 shadow-md rounded-md border dark:border-gray-700">
                          <strong>{datum.label}</strong>
                          <div>{datum.value} transactions</div>
                        </div>
                      )}
                      theme={pieChartTheme}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No transaction data available for the past 6 months</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lease Decay Analysis */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Lease Decay Analysis</CardTitle>
                    <CardDescription>
                      How remaining lease affects property value per square meter
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {leaseDecayData.length > 0 ? (
                    <ResponsiveLine
                      data={[
                        {
                          id: "Price per SQM",
                          data: leaseDecayAverages.map(d => ({
                            x: d.remainingLease,
                            y: d.averagePricePerSqm
                          })),
                          color: "hsl(210, 70%, 50%)"
                        },
                        {
                          id: "Trend Line",
                          data: leaseDecayTrendLine,
                          color: "hsl(0, 70%, 50%)",
                          dashed: true
                        }
                      ]}
                      margin={{ top: 50, right: 110, bottom: 50, left: 80 }}
                      xScale={{ 
                        type: 'linear', 
                        min: 'auto', 
                        max: 'auto' 
                      }}
                      yScale={{ 
                        type: 'linear', 
                        min: 'auto', 
                        max: 'auto',
                        stacked: false,
                        reverse: false
                      }}
                      curve="monotoneX"
                      axisTop={null}
                      axisRight={null}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Remaining Lease (Years)',
                        legendOffset: 36,
                        legendPosition: 'middle'
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Price per Square Meter (SGD)',
                        legendOffset: -60,
                        legendPosition: 'middle',
                        format: value => `$${(value as number).toLocaleString()}`
                      }}
                      enablePoints={true}
                      pointSize={10}
                      pointColor={{ theme: 'background' }}
                      pointBorderWidth={2}
                      pointBorderColor={{ from: 'serieColor' }}
                      pointLabelYOffset={-12}
                      enableArea={true}
                      areaOpacity={0.15}
                      useMesh={true}
                      enableCrosshair={true}
                      crosshairType="x"
                      enableSlices="x"
                      sliceTooltip={({ slice }) => {
                        // Find the point from the Price per SQM series
                        const point = slice.points.find(p => p.serieId === "Price per SQM");
                        if (!point) return null;
                        
                        const x = point.data.x as number;
                        const y = point.data.y as number;
                        
                        // Find the corresponding data point in leaseDecayAverages
                        const dataPoint = leaseDecayAverages.find(d => 
                          Math.abs(d.remainingLease - x) < 0.1
                        );
                        
                        return (
                          <div className="bg-white dark:bg-gray-900 p-2 shadow-md rounded-md border dark:border-gray-700">
                            <strong>Remaining Lease: {Math.round(x)} years</strong>
                            <div>Average Price: ${y.toLocaleString()} per sqm</div>
                            {dataPoint && (
                              <div>Based on {dataPoint.count} transactions</div>
                            )}
                          </div>
                        );
                      }}
                      legends={[
                        {
                          anchor: 'bottom-right',
                          direction: 'column',
                          justify: false,
                          translateX: 100,
                          translateY: 0,
                          itemsSpacing: 0,
                          itemDirection: 'left-to-right',
                          itemWidth: 80,
                          itemHeight: 20,
                          itemOpacity: 0.75,
                          symbolSize: 12,
                          symbolShape: 'circle',
                          symbolBorderColor: 'rgba(255, 255, 255, 0.3)',
                          effects: [
                            {
                              on: 'hover',
                              style: {
                                itemBackground: 'rgba(255, 255, 255, 0.05)',
                                itemOpacity: 1
                              }
                            }
                          ]
                        }
                      ]}
                      theme={chartTheme}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Not enough lease data available for analysis</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>This chart shows how property values (per square meter) correlate with remaining lease years. The trend line indicates the average rate of lease decay. Properties with shorter remaining leases typically sell at lower prices per square meter.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

// Helper functions
function formatMonth(month: string): string {
  if (!month || month === 'Unknown') return 'Unknown';
  
  const [year, monthNum] = month.split('-');
  if (!year || !monthNum) return month;
  
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatTransactionDate(date: string): string {
  if (!date) return '';
  
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

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

function calculateRecentMonthChange(data: { x: string, y: number }[]): number {
  if (data.length < 2) return 0;
  
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.x);
    const dateB = new Date(b.x);
    return dateB.getTime() - dateA.getTime();
  });
  
  const mostRecent = sortedData[0].y;
  const secondMostRecent = sortedData[1].y;
  
  return ((mostRecent - secondMostRecent) / secondMostRecent) * 100;
}

export default PropertyAnalytics; 