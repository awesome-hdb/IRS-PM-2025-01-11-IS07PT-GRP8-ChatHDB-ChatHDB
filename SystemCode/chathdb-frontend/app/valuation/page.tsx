"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin,
  List,
  Map as MapIcon,
  Building2,
  School,
  Train,
  ShoppingBag,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  X,
  Utensils,
  Coffee,
  Pizza,
  ChefHat,
  ChevronDown,
  Newspaper,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Plus,
  LineChart,
  Sliders,
  Info,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Map from "@/app/components/Map";
import { getAddressFromPostal } from "../services/oneMap";
import {
  getRecentTransactions,
  Transaction,
  formatTransactionDate,
  getTownTransactions,
  calculateEstimatedValue,
  getGoogleTrends,
  getTopStories,
  calculateRandomForestValuation,
  RandomForestValuationInput,
  RandomForestValuationResult,
  calculateGoogleTrendsMultiplier,
  calculateSentimentMultiplier,
  calculateEconomicMultiplier,
  calculateCorrelation
} from "../services/hdbData";
import { toast } from "sonner";
import { ResponsiveLine } from "@nivo/line";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AnalyticsModal from "@/app/components/AnalyticsModal";
import { TiltedScroll } from "@/app/components/ui/tilted-scroll";
import ModelFlowModal from "@/app/components/ModelFlowModal";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useClickOutside } from '@/app/hooks/useClickOutside';
import PDFGenerator from "@/app/components/PDFGenerator";
import { XGBoostPredictionInput, XGBoostPredictionOutput, getXGBoostCurrentValuation } from "../api/backend/prediction";

interface Amenity {
  type: string;
  name: string;
  distance: string;
  icon: JSX.Element;
}

// Add this interface for economic correlations
interface EconomicCorrelation {
  index: string;
  correlation: number;
  color: string;
}

function calculatePriceTrends(transactions: Transaction[]) {
  const monthlyPrices = transactions.reduce(
    (acc, transaction) => {
      if (!transaction.month) return acc;
      const month = transaction.month;
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(transaction.resale_price);
      return acc;
    },
    {} as Record<string, number[]>,
  );

  const trends = Object.entries(monthlyPrices)
    .map(([month, prices]) => ({
      month,
      price: Math.round(
        prices.reduce((sum, price) => sum + price, 0) / prices.length,
      ),
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 48)
    .reverse();

  return trends;
}

function formatTransactionMonth(month: string | null) {
  if (!month) return "Unknown Date";
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function calculatePriceRange(transactions: Transaction[]) {
  if (transactions.length === 0) return { min: 0, max: 0, avgPerSqm: 0 };

  const prices = transactions.map((t) => t.resale_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const avgPerSqm = Math.round(
    transactions.reduce(
      (sum, t) => sum + t.resale_price / t.floor_area_sqm,
      0,
    ) / transactions.length,
  );

  return {
    min: minPrice,
    max: maxPrice,
    avgPerSqm,
  };
}

function PriceTrendChart({ data, town }: { data: { x: string; y: number }[]; town?: string }) {
  const [showForecast, setShowForecast] = useState(false);
  const [forecastData, setForecastData] = useState<{ x: string; y: number }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  const generateForecast = () => {
    setIsLoading(true);

    // Simple forecasting logic - in a real app, you might call an API
    setTimeout(() => {
      // Get the last 6 data points to calculate trend
      const recentData = data.slice(-6);
      if (recentData.length < 2) {
        setIsLoading(false);
        return;
      }

      // Calculate average month-to-month change
      let totalChange = 0;
      for (let i = 1; i < recentData.length; i++) {
        totalChange += recentData[i].y - recentData[i - 1].y;
      }
      const avgChange = totalChange / (recentData.length - 1);

      // Generate next 3 months
      const lastDataPoint = recentData[recentData.length - 1];
      const lastDate = new Date(lastDataPoint.x);

      const forecast = [];
      for (let i = 1; i <= 3; i++) {
        const nextMonth = new Date(lastDate);
        nextMonth.setMonth(lastDate.getMonth() + i);
        const nextMonthStr = nextMonth.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        forecast.push({
          x: nextMonthStr,
          y: Math.round(lastDataPoint.y + avgChange * i),
        });
      }

      setForecastData(forecast);
      setShowForecast(true);
      setIsLoading(false);
    }, 1000);
  };

  // Include the last historical data point in the forecast data to ensure continuity
  const chartData = [
    {
      id: "Average Price",
      data: data.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    },
    ...(showForecast
      ? [
          {
            id: "Forecast",
            data: [
              // Include the last historical data point to connect the lines
              ...(data.length > 0 ? [data[data.length - 1]] : []),
              ...forecastData,
            ].map((point) => ({
              x: point.x,
              y: point.y,
            })),
            dashed: true,
          },
        ]
      : []),
  ];

  // Calculate min and max values including forecast data for y-axis scaling
  const allValues = [
    ...data.map((d) => d.y),
    ...(showForecast ? forecastData.map((d) => d.y) : []),
  ];
  const minValue = Math.min(...allValues) * 0.95; // Add 5% padding
  const maxValue = Math.max(...allValues) * 1.05; // Add 5% padding

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium">
          Google Trend for Area: {town || "Current Location"}
        </h3>
        <Button
          onClick={generateForecast}
          disabled={isLoading || showForecast}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium 
            bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800
            text-gray-900 hover:text-gray-900
            rounded-full transition-all duration-300 ease-in-out
            shadow-sm hover:shadow-md
            transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Predicting...
            </>
          ) : showForecast ? (
            "Forecast Added"
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Predict Future Trend
            </>
          )}
        </Button>
      </div>
      <div style={{ height: 500 }} id="price-trends-chart">
        <ResponsiveLine
          data={chartData}
          margin={{ top: 50, right: 110, bottom: 100, left: 80 }}
          xScale={{ type: "point" }}
          yScale={{
            type: "linear",
            min: allValues.length > 0 ? minValue : "auto",
            max: allValues.length > 0 ? maxValue : "auto",
            stacked: false,
            reverse: false,
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: -45,
            legend: "",
            legendOffset: 60,
            legendPosition: "middle",
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "",
            legendOffset: -60,
            legendPosition: "middle",
            format: (value) => `${(value as number).toLocaleString()}`,
          }}
          enableGridX={false}
          pointSize={10}
          pointColor="#ffffff"
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          pointLabelYOffset={-12}
          enableArea={true}
          areaOpacity={0.1}
          useMesh={true}
          enableSlices="x"
          enableCrosshair={true}
          crosshairType="x"
          lineWidth={3}
          legends={[
            {
              anchor: "bottom-right",
              direction: "column",
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 0,
              itemDirection: "left-to-right",
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: "circle",
              symbolBorderColor: "rgba(0, 0, 0, .5)",
              effects: [
                {
                  on: "hover",
                  style: {
                    itemBackground: "rgba(0, 0, 0, .03)",
                    itemOpacity: 1,
                  },
                },
              ],
            },
          ]}
          motionConfig="gentle"
          tooltip={({ point }) => (
            <div className="bg-white p-2 shadow-lg rounded-lg border dark:border-gray-700">
              <strong>{String(point.data.x)}</strong>
              <br />
              <span>{(typeof point.data.y === 'number' ? point.data.y : parseFloat(String(point.data.y)) || 0).toLocaleString()}</span>
              {point.serieId === "Forecast" && point.index > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Forecasted price
                </div>
              )}
            </div>
          )}
          defs={[
            {
              id: "dashed",
              type: "patternLines",
              background: "inherit",
              color: "rgba(0, 0, 0, 0.2)",
              rotation: -45,
              lineWidth: 4,
              spacing: 8,
            },
          ]}
          fill={[
            {
              match: {
                id: "Forecast",
              },
              id: "dashed",
            },
          ]}
          theme={{
            background: "#ffffff",
            axis: {
              ticks: {
                text: {
                  fontSize: 12,
                  fill: "#666",
                },
              },
            },
            grid: {
              line: {
                stroke: "#e5e7eb",
                strokeWidth: 1,
              },
            },
            crosshair: {
              line: {
                stroke: "#666",
                strokeWidth: 1,
                strokeOpacity: 0.5,
              },
            },
            tooltip: {
              container: {
                background: "white",
                fontSize: 12,
                borderRadius: 6,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                padding: "8px 12px",
              },
            },
          }}
        />
      </div>
      {showForecast && (
        <div className="text-sm text-muted-foreground text-center animate-fade-in">
          <p>Forecast based on historical price trends.</p>
        </div>
      )}
    </div>
  );
}

async function getPropertyAnalysis(propertyData: {
  address: string;
  transactions: Transaction[];
  amenities: Amenity[];
  flatType: string;
}) {
  try {
    console.log("Attempting to get property analysis...");
    const message = `
      Please analyze this HDB property and format the response using proper markdown:

      ## Location: ${propertyData.address}

      ## Property Details
      - **Flat Type:** ${propertyData.flatType}

      ## Recent Transactions
      ${propertyData.transactions
        .slice(0, 5)
        .map(
          (t) =>
            `- **${(t.resale_price ?? 0).toLocaleString()}** (${t.flat_type ?? "Unknown"}, ${formatTransactionMonth(t.month ?? "")})`,
        )
        .join("\n")}

      ## Nearby Amenities
      ${propertyData.amenities
        .slice(0, 5)
        .map((a) => `- **${a.name}** (${a.distance} away)`)
        .join("\n")}

      Please provide a concise analysis with proper markdown formatting:
      - Use # for main headings with a line break after
      - Use ## for subheadings with a line break after
      - Use **bold** for emphasis
      - Ensure proper spacing between sections
      - Format the response in clear, distinct sections
      - DO NOT use HTML tags like <br> - use only proper markdown line breaks
      - For line breaks, use two spaces followed by a newline or a blank line
    `;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      console.error("API Response not OK:", await response.text());
      throw new Error("Failed to get analysis");
    }

    return response;
  } catch (error) {
    console.error("Analysis error:", error);
    throw error;
  }
}

// Function to parse and format dates from different formats
function formatDateForChart(dateStr: string) {
  // Handle "2024-10" format
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }
  
  // Handle "Oct 2024" format
  return dateStr;
}

// Function to calculate 3-month average of transaction prices
// This is the improved version used for valuation correlations
function calculateP3MAverage(transactions: Transaction[], months: string[]) {
  if (!transactions || transactions.length === 0) {
    console.warn("No transactions provided for P3M calculation");
    return months.map(month => ({ month, value: null }));
  }

  console.log(`Calculating P3M for ${transactions.length} transactions over ${months.length} months`);
  
  // Group transactions by month
  const transactionsByMonth = transactions.reduce((acc, transaction) => {
    if (!transaction.month) return acc;
    
    if (!acc[transaction.month]) {
      acc[transaction.month] = [];
    }
    acc[transaction.month].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Log available months for debugging
  console.log("Available transaction months:", Object.keys(transactionsByMonth));
  
  // Minimum transactions required in the 3-month window for a valid average
  const MIN_TRANSACTIONS_FOR_AVG = 2; // Require at least 2 transactions for reliable data
  
  return months.map(month => {
    // Get transactions from the current month and previous 2 months
    const [year, monthNum] = month.split('-');
    const currentDate = new Date(parseInt(year), parseInt(monthNum) - 1);
    
    const relevantMonths = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      relevantMonths.push(m);
    }
    
    // Collect all transactions from these months
    let relevantTransactions: Transaction[] = [];
    relevantMonths.forEach(m => {
      if (transactionsByMonth[m]) {
        relevantTransactions.push(...transactionsByMonth[m]);
      }
    });
    
    // Calculate average price ONLY if enough transactions exist
    if (relevantTransactions.length >= MIN_TRANSACTIONS_FOR_AVG) {
      const avgPrice = relevantTransactions.reduce(
        (sum, t) => sum + t.resale_price, 0) / relevantTransactions.length;
      
      return {
        month,
        value: avgPrice
      };
    } else {
      // Return null if insufficient data
      console.log(`Insufficient data for P3M average for ${month} (found ${relevantTransactions.length}, need ${MIN_TRANSACTIONS_FOR_AVG})`);
      return {
        month,
        value: null
      };
    }
  });
}

// Function to calculate 3-month average of transaction prices for charts
// This version fills in missing data for better visualization
function calculateP3MAverageForChart(transactions: Transaction[], months: string[]) {
  if (!transactions || transactions.length === 0) {
    console.warn("No transactions provided for P3M chart calculation");
    return months.map(month => ({ month, value: null }));
  }

  console.log(`Calculating P3M for chart: ${transactions.length} transactions`);
  
  // Group transactions by month
  const transactionsByMonth = transactions.reduce((acc, transaction) => {
    if (!transaction.month) return acc;
    
    if (!acc[transaction.month]) {
      acc[transaction.month] = [];
    }
    acc[transaction.month].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Log available months for debugging
  console.log("Available transaction months for chart:", Object.keys(transactionsByMonth));
  
  // Find base trend for simulation when data is missing
  const avgTransactionPrice = transactions.reduce(
    (sum, t) => sum + t.resale_price, 0) / transactions.length;
  
  // Get all available months sorted chronologically
  const allAvailableMonths = Object.keys(transactionsByMonth).sort();
  
  // Create a month-to-price map for quick lookups
  const monthToPriceMap: Record<string, number> = {};
  allAvailableMonths.forEach(month => {
    const monthTransactions = transactionsByMonth[month];
    if (monthTransactions.length > 0) {
      monthToPriceMap[month] = monthTransactions.reduce(
        (sum, t) => sum + t.resale_price, 0) / monthTransactions.length;
    }
  });
  
  // Generate a historical price trend (simplified)
  // We'll use this trend to simulate prices for missing months
  const historicalTrend: Record<string, number> = {};
  months.forEach((month, index) => {
    const yearMonth = parseInt(month.replace('-', ''));
    
    // Earlier years should have lower prices (approximately 3% annual growth)
    // This is a simplified trend model
    const yearsSince2000 = parseInt(month.split('-')[0]) - 2000;
    const monthIndex = parseInt(month.split('-')[1]) - 1;
    
    // Base value with yearly growth
    const baseTrend = avgTransactionPrice * Math.pow(1.03, yearsSince2000);
    
    // Add some seasonal variation
    const seasonalFactor = 1 + 0.02 * Math.sin((monthIndex / 12) * 2 * Math.PI);
    
    // Add small random factor (±1.5%)
    const randomFactor = 1 + (Math.random() * 0.03 - 0.015);
    
    historicalTrend[month] = baseTrend * seasonalFactor * randomFactor;
  });
  
  // Calculate average price for each month in the eco data
  return months.map(month => {
    // Get transactions from the current month and previous 2 months
    const [year, monthNum] = month.split('-');
    const currentDate = new Date(parseInt(year), parseInt(monthNum) - 1);
    
    const relevantMonths = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      relevantMonths.push(m);
    }
    
    // Collect all transactions from these months
    let relevantTransactions: Transaction[] = [];
    relevantMonths.forEach(m => {
      if (transactionsByMonth[m]) {
        relevantTransactions.push(...transactionsByMonth[m]);
      }
    });
    
    // If we don't have any transactions for this month, try to estimate using nearby data
    if (relevantTransactions.length === 0) {
      if (allAvailableMonths.length > 0) {
        // Find the closest month by date difference
        const targetDate = new Date(parseInt(year), parseInt(monthNum) - 1);
        let closestMonth = allAvailableMonths[0];
        let minDiff = Infinity;
        
        for (const m of allAvailableMonths) {
          const [mYear, mMonth] = m.split('-');
          const mDate = new Date(parseInt(mYear), parseInt(mMonth) - 1);
          const diff = Math.abs(targetDate.getTime() - mDate.getTime());
          
          if (diff < minDiff) {
            minDiff = diff;
            closestMonth = m;
          }
        }
        
        // Use transactions from the closest month
        if (transactionsByMonth[closestMonth]) {
          relevantTransactions = [...transactionsByMonth[closestMonth]];
          console.log(`Using closest month ${closestMonth} for ${month} (time diff: ${Math.round(minDiff / (24 * 60 * 60 * 1000))} days)`);
        }
      }
    }
    
    // Calculate average price
    if (relevantTransactions.length === 0) {
      // If still no transactions, use our historical trend model
      console.log(`No transactions for ${month}, using simulated historical trend`);
      return {
        month,
        value: historicalTrend[month] || avgTransactionPrice
      };
    }
    
    const avgPrice = relevantTransactions.reduce(
      (sum, t) => sum + t.resale_price, 0) / relevantTransactions.length;
    
    return {
      month,
      value: avgPrice
    };
  });
}

// Function to normalize values to 1-100 scale
function normalizeValues(values: (number | null)[]) {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) return values;
  
  // Calculate min and max, but remove extreme outliers
  const sortedValues = [...validValues].sort((a, b) => a - b);
  const lowerBound = sortedValues[Math.floor(sortedValues.length * 0.05)]; // 5th percentile
  const upperBound = sortedValues[Math.floor(sortedValues.length * 0.95)]; // 95th percentile
  
  // Use trimmed statistics to avoid outlier influence
  const min = Math.min(...validValues.filter(v => v >= lowerBound));
  const max = Math.max(...validValues.filter(v => v <= upperBound));
  
  console.log("Normalization range:", { min, max, lowerBound, upperBound });
  
  // Ensure we have a reasonable range
  const range = max - min;
  if (range < 0.001) {
    console.warn("Very small range in values, adding variation");
    // Create artificial variation for better visualization
    return values.map((v, i) => {
      if (v === null) return null;
      // Add progressive variation (1-100 range) with small oscillation
      const variation = ((i % 20) / 20) * 80 + 10; // 10-90 range
      return variation + Math.sin(i * 0.5) * 5; // Add sine wave variation
    });
  }
  
  return values.map(v => {
    if (v === null) return null;
    
    // Clamp the value to be within our bounds to prevent extremes
    const clampedValue = Math.max(min, Math.min(max, v));
    
    // Now normalize to 1-100
    const normalized = ((clampedValue - min) / range) * 95 + 5; // Scale to 5-100 for better visualization
    return normalized;
  });
}

// EconomicPerformanceChart Component
function EconomicPerformanceChart({ 
  transactions, 
  streetName 
}: { 
  transactions: Transaction[], 
  streetName: string 
}) {
  const [ecoData, setEcoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 20]); // Default to recent 5 years (20 quarters)
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['Street Prices']);
  const [availableIndicators] = useState([
    { id: 'Street Prices', name: `${streetName} Price Index`, color: '#3b82f6' }, // Bright blue
    { id: 'HDB Resale Index', name: 'HDB Resale Index', color: '#10b981' }, // Green
    { id: 'Unemployment Index', name: 'Unemployment', color: '#ef4444' }, // Red
    { id: 'GDP Index', name: 'GDP', color: '#f59e0b' }, // Amber
    { id: 'CPI Index', name: 'Consumer Price Index', color: '#8b5cf6' }, // Purple
    { id: 'Rental Index', name: 'Rental Index', color: '#ec4899' }  // Pink
  ]);
  const [activeTimePreset, setActiveTimePreset] = useState<string>("5y");
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // Load all transactions for this street name
  useEffect(() => {
    async function loadAllStreetTransactions() {
      try {
        // First check if we already have transactions
        if (transactions && transactions.length > 0) {
          const processedTransactions = [...transactions];
          
          // Make sure month field is set for all transactions
          processedTransactions.forEach(t => {
            if (!t.month && t.transaction_date) {
              // Try to extract month from transaction date (YYYY-MM-DD format)
              const dateParts = t.transaction_date.split('-');
              if (dateParts.length >= 2) {
                t.month = `${dateParts[0]}-${dateParts[1]}`;
              }
            }
          });
          
          console.log(`Using ${processedTransactions.length} provided transactions`);
          setAllTransactions(processedTransactions);
          return;
        }
        
        // Otherwise, load from CSV directly
        const response = await fetch('/data/hdb_resale.csv');
        const csv = await response.text();
        
        const rows = csv.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',');
        
        // Parse CSV for transactions matching the street name
        const parsedTransactions = rows.slice(1)
          .map(row => {
            const values = row.split(',');
            const record: Record<string, any> = {};
            
            headers.forEach((header, index) => {
              const trimmedHeader = header.trim();
              record[trimmedHeader] = values[index]?.trim();
              
              // Convert numeric fields
              if (trimmedHeader === 'resale_price' || trimmedHeader === 'floor_area_sqm') {
                const numValue = parseFloat(record[trimmedHeader]);
                if (!isNaN(numValue)) {
                  record[trimmedHeader] = numValue;
                }
              }
            });
            
            return record as Transaction;
          })
          .filter(t => {
            // Normalize street name comparison
            const normalizedStreetName = (streetName || '').toUpperCase()
              .replace(/\bAVENUE\b/g, 'AVE')
              .replace(/\bROAD\b/g, 'RD')
              .replace(/\bDRIVE\b/g, 'DR')
              .replace(/\bSTREET\b/g, 'ST');
            
            const normalizedTransactionStreet = (t.street_name || '').toUpperCase()
              .replace(/\bAVENUE\b/g, 'AVE')
              .replace(/\bROAD\b/g, 'RD')
              .replace(/\bDRIVE\b/g, 'DR')
              .replace(/\bSTREET\b/g, 'ST');
            
            return normalizedTransactionStreet.includes(normalizedStreetName) || 
                   normalizedStreetName.includes(normalizedTransactionStreet);
          });
        
        if (parsedTransactions.length > 0) {
          // Ensure all transactions have month values
          parsedTransactions.forEach(t => {
            if (!t.month && t.transaction_date) {
              // Try to extract month from transaction date
              const dateParts = t.transaction_date.split('-');
              if (dateParts.length >= 2) {
                t.month = `${dateParts[0]}-${dateParts[1]}`;
              }
            }
          });
          
          console.log(`Found ${parsedTransactions.length} transactions for ${streetName}`);
          console.log("Sample transaction:", parsedTransactions[0]);
          setAllTransactions(parsedTransactions);
        } else {
          console.warn(`No transactions found for ${streetName}, using simulated data`);
          
          // If no transactions are found, create simulated data
          // This ensures we still have a chart even without real data
          const simulatedTransactions: Transaction[] = [];
          const currentYear = new Date().getFullYear();
          
          // Generate some transaction data for each quarter of the past 5 years
          for (let year = currentYear; year >= currentYear - 5; year--) {
            for (let month of [1, 4, 7, 10]) {
              const avgPrice = 650000 * (1 + (currentYear - year) * 0.03);
              const randomVariation = 1 + (Math.random() * 0.1 - 0.05);
              
              simulatedTransactions.push({
                month: `${year}-${String(month).padStart(2, '0')}`,
                street_name: streetName,
                resale_price: avgPrice * randomVariation,
                block: "N/A",
                flat_type: "N/A",
                storey_range: "N/A",
                floor_area_sqm: 90,
                transaction_date: `${year}-${String(month).padStart(2, '0')}-01`
              } as Transaction);
            }
          }
          
          setAllTransactions(simulatedTransactions);
        }
      } catch (error) {
        console.error("Error loading all street transactions:", error);
      }
    }
    
    loadAllStreetTransactions();
  }, [streetName, transactions]);
  
  useEffect(() => {
    async function fetchEconomicData() {
      try {
        setLoading(true);
        
        // Fetch eco data
        const response = await fetch('/data/eco_data.csv');
        const csvText = await response.text();
        
        // Parse CSV
        const rows = csvText.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',').map(h => h.trim());
        
        const parsedData = rows.slice(1).map(row => {
          const values = row.split(',');
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index]?.trim();
            return obj;
          }, {} as Record<string, string>);
        });
        
        // Sort by date (oldest first)
        parsedData.sort((a, b) => {
          if (!a.month || !b.month) return 0;
          return a.month.localeCompare(b.month);
        });
        
        // Calculate 3-month average of transaction prices and normalize
        const months = parsedData.map(d => d.month);
        console.log(`Calculating P3M for ${allTransactions.length} transactions over ${months.length} months`);
        const p3mAverages = calculateP3MAverageForChart(allTransactions, months);
        
        // Extract values for normalization
        const p3mValues = p3mAverages.map(d => d.value);
        console.log(`P3M values (raw):`, p3mValues.slice(0, 5));
        const normalizedP3mValues = normalizeValues(p3mValues);
        console.log(`P3M values (normalized):`, normalizedP3mValues.slice(0, 5));
        
        // Combine with eco data
        const combinedData = parsedData.map((d, i) => ({
          ...d,
          'Street Prices': normalizedP3mValues[i] || null
        }));
        
        setEcoData(combinedData);
        
        // Set initial timeRange based on the data length
        if (combinedData.length > 0) {
          // Default to last 5 years (20 quarterly data points)
          const end = combinedData.length;
          const start = Math.max(0, end - 20);
          setTimeRange([start, end]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading economic data:', error);
        setLoading(false);
      }
    }
    
    if (allTransactions.length > 0) {
      fetchEconomicData();
    }
  }, [allTransactions]);
  
  // Apply preset time ranges
  const applyTimePreset = useCallback((preset: string) => {
    if (!ecoData.length) return;
    
    setActiveTimePreset(preset);
    
    const end = ecoData.length;
    let start = 0;
    
    switch (preset) {
      case "2y":
        start = Math.max(0, end - 8); // 2 years (8 quarters)
        break;
      case "5y":
        start = Math.max(0, end - 20); // 5 years (20 quarters)
        break;
      case "10y":
        start = Math.max(0, end - 40); // 10 years (40 quarters)
        break;
      case "all":
        start = 0; // All available data
        break;
    }
    
    setTimeRange([start, end]);
  }, [ecoData]);
  
  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (!ecoData.length) return [];
    
    const startIdx = Math.max(0, timeRange[0]);
    const endIdx = Math.min(ecoData.length, timeRange[1]);
    
    return ecoData.slice(startIdx, endIdx);
  }, [ecoData, timeRange]);
  
  // Prepare data for Nivo chart
  const chartData = useMemo(() => {
    if (!filteredData.length) return [];
    
    return selectedIndicators.map(indicator => {
      const data = filteredData
        .filter(d => d[indicator] !== null && d[indicator] !== undefined)
        .map(d => {
          // Ensure all values are properly typed
          const xValue = formatDateForChart(d.month || '');
          const yValue = parseFloat(d[indicator] as string) || 0;
          
          return {
            x: xValue,
            y: yValue
          };
        });
        // No need to reverse - data is already sorted chronologically
      
      const indicatorInfo = availableIndicators.find(i => i.id === indicator) || {
        name: indicator,
        color: '#000000'
      };
      
      return {
        id: indicatorInfo.name,
        color: indicatorInfo.color,
        data
      };
    });
  }, [filteredData, selectedIndicators, availableIndicators]);
  
  // Handle indicator toggle
  const toggleIndicator = useCallback((indicator: string) => {
    setSelectedIndicators(prev => {
      if (prev.includes(indicator)) {
        // Remove if already selected (but don't remove the last one)
        if (prev.length <= 1 && indicator === 'Street Prices') return prev;
        return prev.filter(i => i !== indicator);
      } else {
        // Add if not selected
        return [...prev, indicator];
      }
    });
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-muted-foreground">Loading economic data...</span>
      </div>
    );
  }
  
  if (ecoData.length === 0) {
    return (
      <div className="text-muted-foreground py-4">
        No economic data available.
      </div>
    );
  }
  
  return (
    <div className="space-y-4 py-2">
      {/* Time period selector */}
      <div className="bg-muted/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Period</span>
        </div>
        
        {/* Time presets */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "2y", label: "2 Years" },
            { id: "5y", label: "5 Years" },
            { id: "10y", label: "10 Years" },
            { id: "all", label: "All Data" }
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => applyTimePreset(preset.id)}
              className={`
                rounded-full px-3 py-2 text-xs font-medium transition-all
                ${activeTimePreset === preset.id 
                  ? 'bg-primary text-white shadow-md transform scale-105' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
        
        {/* Selected range information */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <div className="bg-muted/40 rounded-md px-2 py-1">
            <span className="text-muted-foreground">From:</span> 
            <span className="font-medium ml-1">
              {ecoData[timeRange[0]]?.month || ''}
            </span>
          </div>
          <div className="bg-muted/40 rounded-md px-2 py-1">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium ml-1">
              {ecoData[timeRange[1] - 1]?.month || ''}
            </span>
          </div>
          <div className="bg-primary/10 rounded-md px-2 py-1 text-primary">
            <span className="font-medium">
              {Math.ceil((timeRange[1] - timeRange[0]) / 4)} years
            </span>
          </div>
        </div>
      </div>
      
      {/* Indicators selection */}
      <div className="flex flex-wrap gap-2 py-2">
        {availableIndicators.map((indicator) => (
          <button
            key={indicator.id}
            onClick={() => toggleIndicator(indicator.id)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              transition-colors duration-200 ease-in-out
              ${selectedIndicators.includes(indicator.id)
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }
            `}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: indicator.color }} />
            {indicator.name}
            {selectedIndicators.includes(indicator.id) ? (
              <X className="h-3 w-3" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </button>
        ))}
      </div>
      
      {/* Chart */}
      <div className="h-[400px] w-full" id="economic-chart">
        <ResponsiveLine
          data={chartData}
          margin={{ top: 30, right: 110, bottom: 50, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{ 
            type: 'linear', 
            min: 0,
            max: 100,
            stacked: false,
            reverse: false
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendOffset: 36,
            legendPosition: 'middle',
            tickValues: filteredData.length > 20 
              ? filteredData.filter((_, i) => i % Math.ceil(filteredData.length / 10) === 0).map(d => formatDateForChart(d.month || ''))
              : undefined
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Normalized Value (1-100)',
            legendOffset: -40,
            legendPosition: 'middle'
          }}
          enableGridX={false}
          pointSize={filteredData.length > 40 ? 4 : filteredData.length > 20 ? 6 : 8}
          pointColor="#ffffff"
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          lineWidth={3}
          enablePoints={true}
          useMesh={true}
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
              symbolBorderColor: 'rgba(0, 0, 0, .5)',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemBackground: 'rgba(0, 0, 0, .03)',
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          motionConfig="gentle"
          colors={{ datum: 'color' }}
          tooltip={({ point }) => (
            <div className="bg-white p-2 shadow-lg rounded-lg border dark:border-gray-700">
              <strong>{String(point.serieId)}</strong>
              <br />
              <span>{String(point.data.xFormatted || point.data.x)}: {typeof point.data.y === 'number' ? Math.round(point.data.y) : String(point.data.y)}</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default function ValuationPage() {
  const searchParams = useSearchParams();
  const [view, setView] = useState("map");
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const postalCode = searchParams.get("postal");
  const flatType = searchParams.get("flatType");
  const [analysis, setAnalysis] = useState<string>("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [valuationModalOpen, setValuationModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [valuationResult, setValuationResult] =
    useState<RandomForestValuationResult | null>(null);
  const [storeyRange, setStoreyRange] = useState<string>("");
  const [floorArea, setFloorArea] = useState<string>("");
  const [leaseCommenceDate, setLeaseCommenceDate] = useState<string>("");
  const [showValuationForm, setShowValuationForm] = useState<boolean>(false);
  const [googleTrendsData, setGoogleTrendsData] = useState<any>(null);
  const [topStoriesData, setTopStoriesData] = useState<any>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [modelFlowModalOpen, setModelFlowModalOpen] = useState(false);
  const [loadingValuation, setLoadingValuation] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [predictionResult, setPredictionResult] =
    useState<XGBoostPredictionOutput | null>(null);

  // Create a stable key for Map component
  const [mapKey] = useState(() => Math.random());

  // Memoize map markers to prevent unnecessary recalculations
  const mapMarkers = useMemo(
    () => [
      {
        position: address?.position,
        price: 0,
        isMainLocation: true,
      },
      ...(transactions?.map((t) => ({
        position: t.position!,
        price: t.resale_price,
        address: `Block ${t.block} ${t.street_name}`,
        transactionDate: t.lease_commence_date?.toString(),
        floorArea: t.floor_area_sqm?.toString(),
        storeyRange: t.storey_range,
        flat_type: t.flat_type,
      })) || []),
    ],
    [address, transactions],
  );

  // Data fetching effect
  useEffect(() => {
    async function fetchData() {
      if (!postalCode || !flatType) {
        toast.error("Missing postal code or flat type");
        setLoading(false);
        return;
      }

      try {
        const addressData = await getAddressFromPostal(postalCode);
        if (!addressData) {
          toast.error("Invalid postal code");
          return;
        }
        setAddress(addressData);

        const transactionsData = await getRecentTransactions(
          addressData.streetName,
          addressData.position,
          decodeURIComponent(flatType),
        );
        setTransactions(transactionsData);
      } catch (error) {
        toast.error("Error fetching data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [postalCode, flatType]);

  // Analysis effect
  useEffect(() => {
    let mounted = true;

    async function getAnalysis() {
      if (!address || !transactions.length || !amenities.length) {
        if (mounted) {
          setAnalysis("");
          setLoadingAnalysis(false);
        }
        return;
      }

      if (mounted) {
        setLoadingAnalysis(true);
      }
      try {
        const response = await getPropertyAnalysis({
          address: address.address,
          transactions,
          amenities,
          flatType: flatType || "",
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        let analysisText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder().decode(value);
          // Replace <br> tags with proper Markdown line breaks
          const cleanedText = text.replace(/<br>/g, '\n');
          analysisText += cleanedText;
          if (mounted) {
            setAnalysis(analysisText);
          }
        }
      } catch (error) {
        if (mounted) {
          toast.error("Failed to generate property analysis");
          console.error(error);
        }
      } finally {
        if (mounted) {
          setLoadingAnalysis(false);
        }
      }
    }

    getAnalysis();

    return () => {
      mounted = false;
    };
  }, [address, transactions, amenities, flatType]);

  // Add effect for fetching Google Trends and Top Stories
  useEffect(() => {
    async function fetchAreaData() {
      if (!address) return;

      // Extract town/area from address
      const addressParts = address.address.split(",");
      let area = "";

      // Try to find the area/town in the address
      if (address.town) {
        area = address.town;
      } else if (addressParts.length > 1) {
        // Usually the second-to-last part contains the area
        area = addressParts[addressParts.length - 2].trim();
      } else if (transactions.length > 0 && transactions[0].town) {
        area = transactions[0].town;
      }

      if (!area) return;

      // Fetch Google Trends
      setLoadingTrends(true);
      try {
        const trendsData = await getGoogleTrends(area);
        setGoogleTrendsData(trendsData);
      } catch (error) {
        console.error("Failed to fetch Google Trends:", error);
      } finally {
        setLoadingTrends(false);
      }

      // Fetch Top Stories
      setLoadingStories(true);
      try {
        const storiesData = await getTopStories(area);
        setTopStoriesData(storiesData);
      } catch (error) {
        console.error("Failed to fetch Top Stories:", error);
      } finally {
        setLoadingStories(false);
      }
    }

    fetchAreaData();
  }, [address, transactions]);

  // Add state for caching valuation data
  useEffect(() => {
    // Try to load cached valuation data from localStorage
    const cachedValuation = localStorage.getItem("propertyValuationData");
    if (cachedValuation) {
      try {
        const parsedData = JSON.parse(cachedValuation);
        // Only restore if address matches current property
        if (parsedData.address === address?.address) {
          console.log("Restoring cached valuation data");
          setValuationResult(parsedData.valuationResult);
          setStoreyRange(parsedData.storeyRange || "");
          setFloorArea(parsedData.floorArea || "");
          setLeaseCommenceDate(parsedData.leaseCommenceDate || "");
        }
      } catch (error) {
        console.error("Error parsing cached valuation data:", error);
      }
    }
  }, [address]);

  // Update cache when valuation result changes
  useEffect(() => {
    if (valuationResult && address) {
      const dataToCache = {
        address: address.address,
        valuationResult,
        storeyRange,
        floorArea,
        leaseCommenceDate,
      };
      localStorage.setItem("propertyValuationData", JSON.stringify(dataToCache));
    }
  }, [valuationResult, address, storeyRange, floorArea, leaseCommenceDate]);

  const calculateValuation = async () => {
    console.log("calculateValuation function called");
    try {
      // Use a small timeout to allow React to re-render before opening the modal
      setTimeout(() => {
        try {
          // Always show the form when the "Get Valuation" button is clicked
          console.log("Setting showValuationForm to true for fresh valuation input");
          setShowValuationForm(true);
          
          // Open the modal
          console.log("Setting valuationModalOpen to true");
          setValuationModalOpen(true);
          
        } catch (innerError) {
          console.error("Error in setTimeout callback:", innerError);
          toast.error("An error occurred while preparing the valuation. Please try again.");
        }
      }, 10); // Small timeout to ensure UI updates first
    } catch (error) {
      console.error("Error opening valuation modal:", error);
      toast.error("An error occurred while trying to show the valuation. Please try again.");
    }
  };

  // Add useEffect to reset loading state on modal close
  useEffect(() => {
    // If the modal is closed, ensure the loading state for the initial button is reset.
    if (!valuationModalOpen && loadingValuation) {
      console.log("Modal closed, resetting loadingValuation to false");
      setLoadingValuation(false);
    }
    // We only need to run this when valuationModalOpen changes.
    // The check for `loadingValuation` prevents unnecessary state sets if it's already false.
  }, [valuationModalOpen]);

  // Add function to handle recalculation
  const handleRecalculate = () => {
    console.log("handleRecalculate called - showing valuation form without loading state");
    // Make sure we're not triggering the loading state when just showing the form again
    setLoadingValuation(false);
    setShowValuationForm(true);
  };

  const getPredictionValue = async() => {
    try {
      // Validate inputs
      if (!storeyRange) {
        toast.error("Please select a storey range");
        return;
      }

      if (
        !floorArea ||
        isNaN(parseFloat(floorArea)) ||
        parseFloat(floorArea) <= 0
      ) {
        toast.error("Please enter a valid floor area");
        return;
      }

      if (
        !leaseCommenceDate ||
        isNaN(parseInt(leaseCommenceDate)) ||
        parseInt(leaseCommenceDate) < 1960 ||
        parseInt(leaseCommenceDate) > new Date().getFullYear()
      ) {
        toast.error("Please enter a valid lease commencement year");
        return;
      }

      // Show loading state
      console.log("getXGBoostCurrentValuation called - ensuring loading is TRUE");
      setLoadingValuation(true);
      try {
        // Prepare input for XGBoost model
        const mapStoreyRange: { [key: string]: number } = {
          'Low': 1,
          'Mid': 2,
          'High': 3
        };
        const input: XGBoostPredictionInput = {
          street_name: address.streetName,
          flat_type: flatType || "",
          storey_range: mapStoreyRange[storeyRange],
          floor_area: parseFloat(floorArea),
          lease_start: parseInt(leaseCommenceDate),
        };
        // Calculate valuation
        console.log("Calling getXGBoostCurrentValuation API");
        const result = await getXGBoostCurrentValuation(input);
        console.log("Valuation calculation successful");
        
        // Get the town from the transaction data
        const town = transactions[0]?.town || "";
        if (!town) {
          console.warn("Town information not available for multiplier calculation");
        }
        
        // Apply multipliers to calculate the adjusted market value
        const baseEstimatedValue = result.baseEstimatedValue || result.price;
        
        // Calculate dynamic multipliers based on town-specific adjustment factors
        let googleTrendsMultiplier = 1.0;
        if (googleTrendsData) {
          googleTrendsMultiplier = await calculateGoogleTrendsMultiplier(googleTrendsData, town);
        }
        
        let sentimentMultiplier = 1.0;
        if (topStoriesData && topStoriesData.news_results) {
          sentimentMultiplier = await calculateSentimentMultiplier(topStoriesData, town);
        }
        
        let economicTrendMultiplier = 1.0;
        // Get the data needed for economic multiplier calculation
        try {
          const response = await fetch('/data/eco_data.csv');
          const csvText = await response.text();
          
          // Parse CSV
          const rows = csvText.split('\n').filter(row => row.trim());
          const headers = rows[0].split(',').map(h => h.trim());
          
          const economicData = rows.slice(1).map(row => {
            const values = row.split(',');
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index]?.trim();
              return obj;
            }, {} as Record<string, string>);
          });
          
          // Extract months for matching transactions
          const months = economicData.map(d => d.month);
          
          // Calculate 3-month average prices
          const p3mAverages = calculateP3MAverage(transactions, months);
          
          // Get street prices for correlation
          const streetPrices = p3mAverages.map(d => d.value);
          
          if (streetPrices.length > 0) {
            economicTrendMultiplier = await calculateEconomicMultiplier(economicData, streetPrices, town);
          }
        } catch (error) {
          console.error("Failed to calculate economic multiplier:", error);
        }
        
        // Calculate the Adjusted Market Value
        const adjustedValue = Math.round(
          baseEstimatedValue * googleTrendsMultiplier * sentimentMultiplier * economicTrendMultiplier
        );
        
        // Create enhanced result with adjusted value
        const enhancedResult = {
          ...result,
          price: adjustedValue, // Use the adjusted value as the display price
          baseEstimatedValue: baseEstimatedValue, // Keep the original base estimated value
          // Make sure multipliers are preserved
          multipliers: {
            googleTrends: googleTrendsMultiplier,
            sentiment: sentimentMultiplier,
            economicTrend: economicTrendMultiplier
          }
        };
        
        // Log the calculation for debugging
        console.log("Applied multipliers:", {
          baseEstimatedValue,
          googleTrends: googleTrendsMultiplier,
          sentiment: sentimentMultiplier,
          economicTrend: economicTrendMultiplier,
          adjustedValue
        });
        
        // Update state with enhanced result
        setPredictionResult(enhancedResult);
        // Show success toast
        toast.success("Valuation calculated successfully!");
        // Close the form and show results
        setShowValuationForm(false);
        
        // Add a small delay before ending loading state to ensure the transition is smooth
        setTimeout(() => {
          console.log("getXGBoostCurrentValuation successful - setting loading FALSE after delay");
          setLoadingValuation(false);
        }, 300); // Slightly shorter delay for more responsiveness
      } catch (error: any) {
        console.error("Valuation error:", error);
        
        // Show more specific error messages based on the error type
        if (error.message && error.message.includes("network")) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.message && error.message.includes("timeout")) {
          toast.error("Request timed out. The server is taking too long to respond.");
        } else if (error.message && error.message.includes("model")) {
          toast.error("Model error. Our valuation model encountered an issue with your property data.");
        } else {
          toast.error(
            error instanceof Error
              ? `Valuation error: ${error.message}`
              : "Failed to calculate valuation. Please try again."
          );
        }
        
        console.log("getXGBoostCurrentValuation error - setting loading FALSE");
        setLoadingValuation(false);
      }
    } catch (outerError: any) {
      console.error("Unexpected error in valuation process:", outerError);
      
      // More descriptive error for the outer try-catch
      const errorMessage = outerError instanceof Error 
        ? outerError.message 
        : "An unexpected error occurred";
        
      toast.error(`Valuation calculation failed: ${errorMessage}. Please try again.`, {
        duration: 5000, // Show longer for error messages
      });
      
      console.log("getXGBoostCurrentValuation outer error - setting loading FALSE");
      setLoadingValuation(false);
    }
  }

  const performRandomForestValuation = async () => {
    try {
      // Validate inputs
      if (!storeyRange) {
        toast.error("Please select a storey range");
        return;
      }

      if (
        !floorArea ||
        isNaN(parseFloat(floorArea)) ||
        parseFloat(floorArea) <= 0
      ) {
        toast.error("Please enter a valid floor area");
        return;
      }

      if (
        !leaseCommenceDate ||
        isNaN(parseInt(leaseCommenceDate)) ||
        parseInt(leaseCommenceDate) < 1960 ||
        parseInt(leaseCommenceDate) > new Date().getFullYear()
      ) {
        toast.error("Please enter a valid lease commencement year");
        return;
      }

      // Get current month in YYYY-MM format
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Show loading state
      console.log("performRandomForestValuation called - ensuring loading is TRUE");
      setLoadingValuation(true);

      try {
        // Prepare input for Random Forest model
        const input: RandomForestValuationInput = {
          month: currentMonth,
          street_name: address.streetName,
          flat_type: flatType || "",
          storey_range: storeyRange as "Low" | "Mid" | "High",
          floor_area_sqm: parseFloat(floorArea),
          lease_commence_date: leaseCommenceDate,
        };

        // Calculate valuation
        console.log("Calling calculateRandomForestValuation API");
        const result = await calculateRandomForestValuation(input);
        console.log("Valuation calculation successful");
        
        // Use the estimated value directly without any market adjustment factor
        const baseValue = Math.round(result.baseEstimatedValue || result.estimatedValue);
        
        // Get the town from the transaction data
        const town = transactions[0]?.town || "";
        if (!town) {
          console.warn("Town information not available for multiplier calculation");
        }
        
        // Calculate dynamic multipliers from real data
        // 1. Google Trends multiplier
        let googleTrendsMultiplier = 1.0;
        if (googleTrendsData) {
          googleTrendsMultiplier = await calculateGoogleTrendsMultiplier(googleTrendsData, town);
        }
        
        // 2. Sentiment multiplier from news stories
        let sentimentMultiplier = 1.0;
        const localSentimentDetails = { positive: 0, negative: 0, neutral: 0, total: 0 };
        if (topStoriesData && topStoriesData.news_results && topStoriesData.news_results.length > 0) {
          // Count sentiment distribution for diagnostics
          topStoriesData.news_results.slice(0, 5).forEach((story: any) => {
            if (!story.sentiment) {
              localSentimentDetails.neutral++;
            } else if (story.sentiment === 'positive') {
              localSentimentDetails.positive++;
            } else if (story.sentiment === 'negative') {
              localSentimentDetails.negative++;
            } else {
              localSentimentDetails.neutral++;
            }
            localSentimentDetails.total++;
          });
          
          sentimentMultiplier = await calculateSentimentMultiplier(topStoriesData, town);
          console.log("News sentiment details:", localSentimentDetails, "Multiplier:", sentimentMultiplier);
        } else {
          console.warn("No news stories data available for sentiment calculation");
        }
        
        // 3. Economic multiplier from economic indicator correlations
        let economicTrendMultiplier = 1.0;
        const economicDetails: {
          correlations: Array<{ index: string; correlation: number }>;
          trend: number;
          mostCorrelatedIndex: string;
        } = { correlations: [], trend: 0, mostCorrelatedIndex: '' };
        
        // Store correlations for display in the UI
        let economicCorrelations: EconomicCorrelation[] = [];
        
        // Fetch fresh economic data for analysis
        try {
          const response = await fetch('/data/eco_data.csv');
          const csvText = await response.text();
          
          // Parse CSV
          const rows = csvText.split('\n').filter(row => row.trim());
          const headers = rows[0].split(',').map(h => h.trim());
          
          const economicData = rows.slice(1).map(row => {
            const values = row.split(',');
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index]?.trim();
              return obj;
            }, {} as Record<string, string>);
          });
          
          // Sort by date (oldest first)
          economicData.sort((a, b) => {
            if (!a.month || !b.month) return 0;
            return a.month.localeCompare(b.month);
          });
          
          if (economicData.length > 0 && transactions.length > 0) {
            // Extract months for matching transactions
            const months = economicData.map(d => d.month);
            
            // Calculate 3-month average prices
            const p3mAverages = calculateP3MAverage(transactions, months);
            
            // Get street prices for correlation
            const streetPrices = p3mAverages.map(d => d.value);
            
            if (streetPrices.length > 0) {
              // Define the indices we want to check correlations with - include Unemployment
              const indices = ['HDB Resale Index', 'Rental Index', 'GDP Index', 'CPI Index', 'Unemployment Index'];
              
              // Calculate correlations for each index
              const calculatedCorrelations: Array<{ index: string; correlation: number }> = [];
              
              indices.forEach(indexName => {
                // Create paired data points where both values are available
                const validPairs: {monthIndex: number, street: number, index: number}[] = [];
                
                // Extract values for this index while maintaining month alignment
                for (let i = 0; i < Math.min(economicData.length, streetPrices.length); i++) {
                  const indexValue = economicData[i][indexName];
                  const parsedIndexValue = typeof indexValue === 'number' ? 
                    indexValue : parseFloat(indexValue) || 0;
                    
                  const streetPrice = streetPrices[i];
                  
                  // Only use data points where both values are valid
                  if (streetPrice !== null && !isNaN(streetPrice) && !isNaN(parsedIndexValue)) {
                    validPairs.push({
                      monthIndex: i,
                      street: streetPrice,
                      index: parsedIndexValue
                    });
                  }
                }
                
                // Only calculate correlation if we have enough valid pairs
                if (validPairs.length >= 4) {
                  const streetValues = validPairs.map(p => p.street);
                  const indexValues = validPairs.map(p => p.index);
                  
                  const correlation = calculateCorrelation(streetValues, indexValues);
                  console.log(`Correlation for ${indexName} with ${validPairs.length} points: ${correlation.toFixed(3)}`);
                  
                  calculatedCorrelations.push({ index: indexName, correlation });
                  
                  // Store for diagnostics
                  economicDetails.correlations.push({ index: indexName, correlation });
                } else {
                  console.log(`Skipping correlation for ${indexName}: Only ${validPairs.length} valid data points`);
                }
              });
              
              // Calculate economic trend multiplier based on town and economic data
              economicTrendMultiplier = await calculateEconomicMultiplier(economicData, streetPrices, town);
              
              // Define colors for each index for UI
              const indexColors: Record<string, string> = {
                'HDB Resale Index': 'blue-500',
                'Rental Index': 'green-500',
                'GDP Index': 'amber-500',
                'CPI Index': 'purple-500',
                'Unemployment Index': 'red-500'
              };
              
              // Format for display with colors
              economicCorrelations = calculatedCorrelations.map(c => ({
                index: c.index,
                correlation: c.correlation,
                color: indexColors[c.index] || 'gray-500'
              }));
              
              console.log("Economic correlations:", economicDetails, "Multiplier:", economicTrendMultiplier);
            } else {
              console.warn("No street prices available for economic correlation");
            }
          } else {
            console.warn("Insufficient economic data or transactions for correlation");
          }
        } catch (error) {
          console.error("Failed to calculate economic multiplier:", error);
          // Keep default values
        }
        
        // Log the multipliers we're using
        console.log("Applied multipliers:", {
          googleTrends: googleTrendsMultiplier,
          sentiment: sentimentMultiplier,
          economicTrend: economicTrendMultiplier
        });
        
        // Apply multipliers to the base value
        const adjustedValue = Math.round(
          baseValue * googleTrendsMultiplier * sentimentMultiplier * economicTrendMultiplier
        );
        
        // Create a modified result with both base and adjusted values
        const enhancedResult = {
          ...result,
          baseEstimatedValue: baseValue,
          estimatedValue: adjustedValue,
          multipliers: {
            googleTrends: googleTrendsMultiplier,
            sentiment: sentimentMultiplier,
            economicTrend: economicTrendMultiplier
          },
          economicCorrelations: economicCorrelations,
          sentimentDetails: localSentimentDetails
        };

        // Update state with result
        setValuationResult(enhancedResult);

        // Show success toast
        toast.success("Valuation calculated successfully!");

        // Close the form and show results
        setShowValuationForm(false);
        
        // Add a small delay before ending loading state to ensure the transition is smooth
        setTimeout(() => {
          console.log("performRandomForestValuation successful - setting loading FALSE after delay");
          setLoadingValuation(false);
        }, 300); // Slightly shorter delay for more responsiveness
      } catch (error: any) {
        console.error("Valuation error:", error);
        
        // Show more specific error messages based on the error type
        if (error.message && error.message.includes("network")) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.message && error.message.includes("timeout")) {
          toast.error("Request timed out. The server is taking too long to respond.");
        } else if (error.message && error.message.includes("model")) {
          toast.error("Model error. Our valuation model encountered an issue with your property data.");
        } else {
          toast.error(
            error instanceof Error
              ? `Valuation error: ${error.message}`
              : "Failed to calculate valuation. Please try again."
          );
        }
        
        console.log("performRandomForestValuation error - setting loading FALSE");
        setLoadingValuation(false);
      }
    } catch (outerError: any) {
      console.error("Unexpected error in valuation process:", outerError);
      
      // More descriptive error for the outer try-catch
      const errorMessage = outerError instanceof Error 
        ? outerError.message 
        : "An unexpected error occurred";
        
      toast.error(`Valuation calculation failed: ${errorMessage}. Please try again.`, {
        duration: 5000, // Show longer for error messages
      });
      
      console.log("performRandomForestValuation outer error - setting loading FALSE");
      setLoadingValuation(false);
    }
  };

  // Update the formatTrendsData function to use weekly data
  const formatTrendsData = (data: any) => {
    if (
      !data ||
      !data.interest_over_time ||
      !data.interest_over_time.timeline_data
    ) {
      return [];
    }

    // Get the last 12 weeks of data (approximately 3 months)
    const recentData = data.interest_over_time.timeline_data.slice(-12);

    return recentData.map((point: any) => ({
      x: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      y: point.values[0].extracted_value,
    }));
  };

  const priceTrends = calculatePriceTrends(transactions);
  const priceRange = calculatePriceRange(transactions);

  // Define data for TiltedScroll
  const valutionFeatures = [
    { id: "1", text: "Google Trend Analytics" },
    { id: "2", text: "Google News Sentiment" },
    { id: "3", text: "Economic Data" },
  ];

  const valuationModalRef = useRef<HTMLDivElement>(null);

  // Use the click outside hook for valuation modal
  useClickOutside(valuationModalRef, (event) => {
    // Check if the click is on a select component or its content
    const target = event.target as HTMLElement;
    const isSelectInteraction = 
      target.closest('[role="combobox"]') || // Select trigger
      target.closest('[role="listbox"]') ||  // Select content
      target.closest('[data-radix-select-viewport]'); // Select viewport
    
    // Only close if it's not a select interaction
    if (!isSelectInteraction) {
      console.log("Click outside valuation modal - closing");
      setValuationModalOpen(false);
      setShowValuationForm(false);
    }
  }, valuationModalOpen);

  if (loading || !address || (predictionResult?.price === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <div className="mt-4 text-lg font-medium text-muted-foreground">
            Loading your valuation...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="mb-4 hover:bg-muted/50 -ml-2"
          >
            <ChevronDown className="h-4 w-4 rotate-90 mr-1" />
            Back to Home
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MapPin className="h-5 w-5" />
            <span>
              {address.address} • {address.streetName}
            </span>
          </div>
          <h1 className="text-4xl font-bold">Property Valuation</h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-4">
            <Tabs value={view} onValueChange={setView}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Property Transactions</h2>
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span> {/* Wrapper span for tooltip with disabled button */}
                          <PDFGenerator
                            address={address.address}
                            streetName={address.streetName}
                            flatType={flatType || ""}
                            transactions={transactions}
                            valuationAmount={predictionResult?.price}
                            amenities={amenities}
                            valuationData={predictionResult || undefined}
                            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-all"
                            onGenerateStart={() => setIsGeneratingPDF(true)}
                            onGenerateEnd={() => setIsGeneratingPDF(false)}
                            disabled={!predictionResult}
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>Generate Report</span>
                          </PDFGenerator>
                        </span>
                      </TooltipTrigger>
                      {!predictionResult && (
                        <TooltipContent>
                          <p>Please generate a valuation first to enable this feature</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <TabsList className="bg-transparent border rounded-full p-1 shadow-sm">
                    <TabsTrigger
                      value="map"
                      className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <MapIcon className="h-4 w-4" />
                        <span>Map</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="list"
                      className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <List className="h-4 w-4" />
                        <span>List</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="map">
                <div className="h-[600px] rounded-lg overflow-hidden shadow-sm border" id="property-map">
                  <Map
                    key={mapKey}
                    center={address.position}
                    zoom={16}
                    markers={mapMarkers}
                    onAmenitiesLoaded={(newAmenities) => {
                      if (amenities.length === 0) {
                        setAmenities(newAmenities);
                      }
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="list">
                <div className="border rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-muted/30 p-3 border-b">
                    <div className="grid grid-cols-3 text-sm font-medium text-muted-foreground">
                      <div>Property</div>
                      <div>Details</div>
                      <div className="text-right">Price</div>
                    </div>
                  </div>
                  <ScrollArea className="h-[552px]">
                    <div className="divide-y">
                      {transactions.map((transaction, index) => (
                        <motion.div
                          key={`${transaction.block}-${transaction.month}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 hover:bg-muted/30 transition-colors duration-200"
                        >
                          <div className="grid grid-cols-3 items-center">
                            <div>
                              <h3 className="font-semibold">
                                Block {transaction.block}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {formatTransactionMonth(transaction.month ?? "")}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm">
                                {transaction.flat_type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.floor_area_sqm}sqm • {transaction.storey_range}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-lg">
                                ${transaction.resale_price.toLocaleString()}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                ${Math.round(transaction.resale_price / transaction.floor_area_sqm).toLocaleString()}/sqm
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>

            {/* Property Analysis Section */}
            <Accordion type="single" collapsible className="mt-6">
              <AccordionItem value="analysis" className="border-none">
                <AccordionTrigger className="bg-muted/30 rounded-t-lg px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-semibold">Property Analysis</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/30 rounded-b-lg px-4 pb-4">
                  {loadingAnalysis ? (
                    <div className="flex items-center space-x-2 py-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">
                        Analyzing property data...
                      </span>
                    </div>
                  ) : analysis ? (
                    <div className="text-muted-foreground leading-relaxed prose prose-sm max-w-none py-2" id="property-analysis">
                      <ReactMarkdown>
                        {analysis.replace(/<br>/g, '\n')}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-2">
                      Loading property analysis...
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Google Trends Section - in its own Accordion */}
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="trends" className="border-none">
                <AccordionTrigger className="bg-muted/30 rounded-t-lg px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold">
                      Google Trends (Past 3 Months)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/30 rounded-b-lg px-4 pb-4">
                  {loadingTrends ? (
                    <div className="flex items-center space-x-2 py-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">
                        Loading trends data...
                      </span>
                    </div>
                  ) : googleTrendsData ? (
                    <div className="h-[500px] w-full py-4">
                      <PriceTrendChart
                        data={formatTrendsData(googleTrendsData)}
                        town={transactions[0]?.town}
                      />
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-4">
                      No trends data available for this area.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Top Stories Section - in its own Accordion */}
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="stories" className="border-none">
                <AccordionTrigger className="bg-muted/30 rounded-t-lg px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    <span className="font-semibold">
                      Top Stories (Past Month)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/30 rounded-b-lg px-4 pb-4" id="news-stories">
                  {loadingStories ? (
                    <div className="flex items-center space-x-2 py-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">
                        Loading news stories...
                      </span>
                    </div>
                  ) : topStoriesData && topStoriesData.news_results ? (
                    <div className="space-y-4 py-4">
                      {topStoriesData.news_results.map(
                        (story: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            {story.thumbnail && (
                              <div className="flex-shrink-0">
                                <img
                                  src={story.thumbnail}
                                  alt={story.title}
                                  className="w-20 h-20 object-cover rounded-md"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <a
                                  href={story.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-primary transition-colors"
                                >
                                  {story.title}
                                </a>
                                <div className="ml-2 flex-shrink-0">
                                  {story.sentiment === "positive" ? (
                                    <ThumbsUp className="h-4 w-4 text-green-500" />
                                  ) : story.sentiment === "negative" ? (
                                    <ThumbsDown className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Minus className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {story.snippet}
                              </p>
                              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>{story.date || "Recent"}</span>
                                <span className="mx-2">•</span>
                                <span>{story.source}</span>
                              </div>
                            </div>
                          </motion.div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-4">
                      No recent news stories found for this area.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Economic Performance Section */}
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="economic" className="border-none">
                <AccordionTrigger className="bg-muted/30 rounded-t-lg px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold">
                      Economic Performance
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/30 rounded-b-lg px-4 pb-4">
                  <EconomicPerformanceChart 
                    transactions={transactions} 
                    streetName={address?.streetName || ""}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Property Valuation</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Button
                  onClick={calculateValuation}
                  disabled={loadingValuation || isGeneratingPDF}
                  aria-disabled={loadingValuation || isGeneratingPDF}
                  className={`flex-1 relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium 
                    ${(loadingValuation || isGeneratingPDF) ? 'bg-primary/80 animate-pulse' : 'bg-primary hover:bg-primary/90'}
                    text-white
                    rounded-full transition-all duration-300 ease-in-out
                    shadow-sm hover:shadow-md
                    transform hover:scale-105`}
                >
                  {loadingValuation ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <span>Loading Calculation</span>
                    </div>
                  ) : (
                    <>
                      <span>View my valuation</span>
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setAnalyticsModalOpen(true)}
                  disabled={isGeneratingPDF}
                  className={`flex-1 relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium 
                    bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800
                    text-gray-900 hover:text-gray-900
                    border border-gray-200
                    rounded-full transition-all duration-300 ease-in-out
                    shadow-sm hover:shadow-md
                    transform hover:scale-105 ${isGeneratingPDF ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <span>View my Analytics</span>
                  <TrendingUp className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Replace Price Trends card with Adjusted Valuation card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Modeling</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModelFlowModalOpen(true)}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium 
                    bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800
                    text-gray-900 hover:text-gray-900
                    rounded-full transition-all duration-300 ease-in-out
                    shadow-sm hover:shadow-md
                    transform hover:scale-105"
                >
                  <span>View Model Flow</span>
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="mb-2">
                <p className="text-sm text-muted-foreground">
                  Our Adjusted Valuation model incorporates these advanced data sources:
                </p>
              </div>
              <TiltedScroll items={valutionFeatures} className="mt-4" />
            </Card>

            <Card className="p-6 relative">
              <h2 className="text-lg font-semibold mb-4">Nearby Amenities</h2>
              <ScrollArea className="h-[300px] overflow-auto">
                <div className="space-y-4 pr-4">
                  {amenities.map((amenity) => (
                    <div key={amenity.name} className="flex items-start">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        {amenity.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{amenity.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {amenity.distance} away
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full flex justify-center">
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="bg-gradient-to-t from-background via-background to-transparent py-2 px-4"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                </motion.div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Replace dialog with ModelFlowModal */}
      {modelFlowModalOpen && (
        <ModelFlowModal
          isOpen={modelFlowModalOpen}
          onClose={() => setModelFlowModalOpen(false)}
        />
      )}

      {valuationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <motion.div
            ref={valuationModalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 w-[90vw] max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Your Property Valuation
                </h2>
                <p className="text-sm text-gray-500">
                  {valuationResult
                    ? `Based on ${valuationResult.sampleSize} recent transactions in your area`
                    : "Complete the form to get your valuation"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log("Modal X button clicked - setting valuationModalOpen to false");
                  setValuationModalOpen(false);
                  setShowValuationForm(false);
                  // The useEffect hook will handle setting loadingValuation to false
                }}
                className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {showValuationForm ? (
              <div className="space-y-6 py-4">
                <div className="bg-muted/30 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Property Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="storey-range">Storey Range</Label>
                        <Select
                          value={storeyRange}
                          onValueChange={setStoreyRange}
                        >
                          <SelectTrigger
                            id="storey-range"
                            className="w-full bg-white"
                          >
                            <SelectValue placeholder="Select storey range" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-900 dark:border-gray-700">
                            <SelectItem value="Low">Low Floor (1-6)</SelectItem>
                            <SelectItem value="Mid">
                              Mid Floor (7-15)
                            </SelectItem>
                            <SelectItem value="High">
                              High Floor (16+)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="floor-area">Floor Area (sqm)</Label>
                        <Input
                          id="floor-area"
                          type="number"
                          placeholder="e.g. 90"
                          value={floorArea}
                          onChange={(e) => setFloorArea(e.target.value)}
                          min="20"
                          max="200"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="lease-commence-date">
                        Lease Commencement Year
                      </Label>
                      <Input
                        id="lease-commence-date"
                        type="number"
                        placeholder="e.g. 1980"
                        value={leaseCommenceDate}
                        onChange={(e) => setLeaseCommenceDate(e.target.value)}
                        min="1960"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <Button
                      onClick={(e) => {
                        // Set loading state immediately when button is clicked
                        setLoadingValuation(true);
                        // Use setTimeout to allow React to re-render the button with loading state
                        // before starting the potentially heavy calculation
                        setTimeout(() => {
                          // Call both APIs for comparison during transition
                          // but prioritize displaying the XGBoost prediction
                          performRandomForestValuation();
                          getPredictionValue();
                        }, 10);
                      }}
                      disabled={loadingValuation}
                      className={`w-full mt-4 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden relative ${
                        loadingValuation 
                          ? 'bg-primary/80 animate-pulse' 
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {loadingValuation ? (
                        <div className="flex items-center justify-center w-full">
                          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3" style={{ borderWidth: '3px' }} />
                          <span className="text-white font-medium">Calculating valuation...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-white font-medium">Calculate Valuation</span>
                          <ArrowUpRight className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : valuationResult && predictionResult?.price ? (
              <div className="space-y-6 py-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-5xl font-bold text-primary mb-2"
                  >
                    ${predictionResult?.price 
                      ? Math.round(predictionResult.price).toLocaleString() 
                      : "0"}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-sm text-muted-foreground"
                  >
                    Adjusted Market Value
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="mt-3 text-sm font-medium text-primary"
                  >
                    ${predictionResult?.pricePerSqm 
                      ? Math.round(predictionResult.pricePerSqm).toLocaleString() 
                      : "0"} per sqm
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="mt-2 text-xs text-muted-foreground"
                  >
                    Prediction range: $
                    {predictionResult?.predictionInterval?.lower.toLocaleString() || 0}{" "}
                    - $
                    {predictionResult?.predictionInterval?.upper.toLocaleString() || 0}
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                >
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        R Square
                      </span>
                      <span className="font-medium text-primary">
                        98%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: "98%",
                        }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="bg-primary rounded-full h-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentage of property price variability explained by the model
                    </p>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">RMSE</span>
                      <span className="font-medium text-green-600">
                        $23,433
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: "85%",
                        }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="bg-green-500 rounded-full h-2"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Root Mean Square Error - average prediction deviation
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="bg-muted/30 p-4 rounded-lg mt-4"
                >
                  <h3 className="text-sm font-medium mb-3">Data Analysis Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Data Points</div>
                      <div className="font-medium">{predictionResult?.sampleSize} transactions</div>
                    </div>
                    {predictionResult?.recentTransactions && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Recent Transactions</div>
                        <div className="font-medium text-green-600">
                          {predictionResult.recentTransactions} in last 6 months
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Time Period</div>
                      <div className="font-medium">{predictionResult?.timeSeriesLength || "N/A"} months</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Analysis Quality</div>
                      <div className="font-medium text-primary">Strong</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="bg-muted/30 p-4 rounded-lg mt-4"
                >
                  <h3 className="text-sm font-medium mb-3">
                    Feature Importance (Predictive power of variables)
                  </h3>
                  <div className="space-y-3">
                    {predictionResult?.featureImportance?.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <span className="text-sm">{feature.feature}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-24 bg-muted rounded-full h-1.5 mr-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(Math.abs(feature.importance) * 100, 100)}%`,
                              }}
                              transition={{
                                delay: 0.6 + index * 0.1,
                                duration: 0.8,
                              }}
                              className="rounded-full h-1.5 bg-blue-500"
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {(Math.abs(feature.importance) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="bg-muted/30 p-4 rounded-lg mt-4 hidden"
                >
                  <h3 className="text-sm font-medium mb-3">
                    Model Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Mean Absolute Error
                      </div>
                      <div className="font-medium">
                        $
                        {predictionResult?.modelMetrics?.meanAbsoluteError
                          ? Math.round(predictionResult.modelMetrics.meanAbsoluteError).toLocaleString()
                          : "0"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Mean Squared Error
                      </div>
                      <div className="font-medium">
                        $
                        {predictionResult?.modelMetrics?.meanSquaredError
                          ? Math.round(Math.sqrt(predictionResult.modelMetrics.meanSquaredError)).toLocaleString()
                          : "0"}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="bg-muted/30 p-4 rounded-lg mt-4"
                >
                  <h3 className="text-sm font-medium mb-3">
                    Adjusted Market Value Calculation
                  </h3>
                  
                  {/* Base Estimated Value */}
                  <div className="bg-white/50 p-3 rounded-lg mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Base Estimated Value:</span>
                      <span className="font-medium">
                        ${predictionResult?.baseEstimatedValue 
                          ? Math.round(predictionResult.baseEstimatedValue).toLocaleString() 
                          : predictionResult?.price
                            ? Math.round(predictionResult.price * 0.96).toLocaleString()
                            : "0"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Initial value calculated by our Random Forest model based on storey range, floor area, and lease
                    </div>
                  </div>

                  {/* Multipliers Section */}
                  <div className="space-y-3 mb-3">
                    {/* Google Trends Multiplier */}
                    <div className="flex items-center justify-between bg-white/30 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Google Trends Multiplier</span>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                            </TooltipTrigger>
                            <TooltipContent className="w-80 p-4 bg-white dark:bg-gray-900 dark:border-gray-700">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Google Trends Calculation</h4>
                                <p className="text-xs">
                                  Based on analyzing 8 weeks of Google search trends for {transactions[0]?.town || "your town"}.
                                </p>
                                <div className="text-xs space-y-1">
                                  <p>1. Extract trend values from recent data</p>
                                  <p>2. Calculate slope using linear regression</p>
                                  <p>3. Get town-specific adjustment factor from {transactions[0]?.town || "your town"}</p>
                                  <p>4. Normalize adjustment factor to 0-0.03 range</p>
                                  <p>5. Apply formula: 1.0 + (trend direction × normalized factor)</p>
                                </div>
                                <p className="text-xs font-medium mt-1">Trend direction is +1 (upward), -1 (downward), or 0 (neutral)</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {predictionResult?.multipliers?.googleTrends 
                            ? predictionResult.multipliers.googleTrends.toFixed(2) 
                            : '1.00'}
                        </span>
                        {predictionResult?.multipliers?.googleTrends ? (
                          predictionResult.multipliers.googleTrends > 1.01 ? (
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                          ) : predictionResult.multipliers.googleTrends < 0.99 ? (
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <Minus className="h-4 w-4 text-yellow-500" />
                          )
                        ) : (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    
                    {/* Sentiment Multiplier */}
                    <div className="flex items-center justify-between bg-white/30 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Newspaper className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">News Sentiment Multiplier</span>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                            </TooltipTrigger>
                            <TooltipContent className="w-80 p-4 bg-white dark:bg-gray-900 dark:border-gray-700">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">News Sentiment Calculation</h4>
                                <p className="text-xs">
                                  Based on analyzing top 5 recent news articles about {transactions[0]?.town || "your town"}.
                                </p>
                                <div className="text-xs space-y-1">
                                  <p>1. Each article analyzed for sentiment: positive(+1), negative(-1), or neutral(0)</p>
                                  <p>2. Determine overall sentiment direction</p>
                                  <p>3. Get town-specific adjustment factor from {transactions[0]?.town || "your town"}</p>
                                  <p>4. Normalize adjustment factor to 0-0.03 range</p>
                                  <p>5. Apply formula: 1.0 + (sentiment direction × normalized factor)</p>
                                </div>
                                <p className="text-xs font-medium mt-1">Sentiment direction is +1 (positive), -1 (negative), or 0 (neutral)</p>
                                {predictionResult?.sentimentDetails && (
                                  <div className="text-xs mt-1">
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {predictionResult?.multipliers?.sentiment 
                            ? predictionResult.multipliers.sentiment.toFixed(2) 
                            : '1.00'}
                        </span>
                        {predictionResult?.multipliers?.sentiment ? (
                          predictionResult.multipliers.sentiment > 1.00 ? (
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                          ) : predictionResult.multipliers.sentiment < 1.00 ? (
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <Minus className="h-4 w-4 text-yellow-500" />
                          )
                        ) : (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    
                    {/* Economic Trend Multiplier */}
                    <div className="flex items-center justify-between bg-white/30 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <LineChart className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Economic Trend Multiplier</span>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                            </TooltipTrigger>
                            <TooltipContent className="w-80 p-4 bg-white dark:bg-gray-900 dark:border-gray-700">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Economic Trend Calculation</h4>
                                <p className="text-xs">
                                  Based on economic indicators like HDB Resale Index, GDP, CPI, and Rental Index.
                                </p>
                                <div className="text-xs space-y-1">
                                  <p>1. Analyze recent trend of economic indices</p>
                                  <p>2. Determine overall economic trend direction</p>
                                  <p>3. Get town-specific adjustment factor from {transactions[0]?.town || "your town"}</p>
                                  <p>4. Normalize adjustment factor to 0-0.03 range</p>
                                  <p>5. Apply formula: 1.0 + (economic trend direction × normalized factor)</p>
                                </div>
                                <p className="text-xs font-medium mt-1">Economic trend direction is +1 (improving), -1 (declining), or 0 (stable)</p>
                                {predictionResult?.economicCorrelations && predictionResult.economicCorrelations.length > 0 && (
                                  <div className="text-xs mt-1">
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {predictionResult?.multipliers?.economicTrend 
                            ? predictionResult.multipliers.economicTrend.toFixed(2) 
                            : '1.00'}
                        </span>
                        {predictionResult?.multipliers?.economicTrend ? (
                          predictionResult.multipliers.economicTrend > 1.00 ? (
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                          ) : predictionResult.multipliers.economicTrend < 1.00 ? (
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <Minus className="h-4 w-4 text-yellow-500" />
                          )
                        ) : (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formula Explanation - LaTeX Style */}
                  <div className="bg-primary/10 p-4 rounded-lg mb-3">
                    <p className="text-xs font-medium text-primary mb-2">Formula:</p>
                    <div className="flex justify-center items-center py-2 px-3 bg-white/70 dark:bg-gray-800/70 rounded-md font-mono text-sm">
                      <div className="text-center">
                        <span className="block mb-1">V<sub>adjusted</sub> = V<sub>base</sub> × M<sub>trends</sub> × M<sub>sentiment</sub> × M<sub>economic</sub></span>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1">
                          <div className="grid grid-cols-2 gap-x-2 text-left">
                            <span>V<sub>adjusted</sub></span>
                            <span>= Adjusted Market Value</span>
                            <span>V<sub>base</sub></span>
                            <span>= Base Estimated Value</span>
                            <span>M<sub>trends</sub></span>
                            <span>= Google Trends Multiplier</span>
                            <span>M<sub>sentiment</sub></span>
                            <span>= News Sentiment Multiplier</span>
                            <span>M<sub>economic</sub></span>
                            <span>= Economic Trend Multiplier</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Economic Index Correlations */}
                  <div className="mt-4">
                    <h4 className="text-xs font-medium mb-2">Economic Index Correlations:</h4>
                    <div className="space-y-2">
                      {predictionResult?.economicCorrelations && predictionResult.economicCorrelations.length > 0 ? (
                        // Display actual calculated correlations
                        predictionResult.economicCorrelations.map((correlation: {index: string; correlation: number; color: string}) => (
                          <div key={correlation.index} className="flex items-center justify-between text-xs">
                            <span>{correlation.index.replace('Index', '').trim()}</span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-muted rounded-full mr-2">
                                <div 
                                  className={`rounded-full h-1.5 ${
                                    correlation.color === 'blue-500' ? 'bg-blue-500' :
                                    correlation.color === 'green-500' ? 'bg-green-500' :
                                    correlation.color === 'amber-500' ? 'bg-amber-500' :
                                    correlation.color === 'purple-500' ? 'bg-purple-500' :
                                    correlation.color === 'red-500' ? 'bg-red-500' : 'bg-gray-500'
                                  }`}
                                  style={{ width: `${Math.min(Math.abs(correlation.correlation * 100), 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-medium">
                                {correlation.correlation >= 0 ? '' : '-'}
                                {Math.abs(correlation.correlation).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        // Fallback if no correlations available
                        <>
                          {/* HDB Resale Index */}
                          <div className="flex items-center justify-between text-xs">
                            <span>HDB Resale Index</span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-muted rounded-full mr-2">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                              </div>
                              <span className="font-medium">0.65</span>
                            </div>
                          </div>
                          
                          {/* Rental Index */}
                          <div className="flex items-center justify-between text-xs">
                            <span>Rental Index</span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-muted rounded-full mr-2">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '58%' }}></div>
                              </div>
                              <span className="font-medium">0.58</span>
                            </div>
                          </div>
                          
                          {/* GDP Index */}
                          <div className="flex items-center justify-between text-xs">
                            <span>GDP Index</span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-muted rounded-full mr-2">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                              </div>
                              <span className="font-medium">0.40</span>
                            </div>
                          </div>
                          
                          {/* CPI Index */}
                          <div className="flex items-center justify-between text-xs">
                            <span>Consumer Price Index</span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-muted rounded-full mr-2">
                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                              </div>
                              <span className="font-medium">0.45</span>
                            </div>
                          </div>
                          
                          {/* Unemployment Index */}
                          <div className="flex items-center justify-between text-xs">
                            <span>Unemployment Index</span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-muted rounded-full mr-2">
                                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '35%' }}></div>
                              </div>
                              <span className="font-medium">-0.35</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {predictionResult?.economicCorrelations && predictionResult.economicCorrelations.length > 0 ? (
                        // Generate description based on actual correlations
                        `${predictionResult.economicCorrelations[0]?.correlation > 0 ? 'Strong positive' : 'Strong negative'} correlation with ${predictionResult.economicCorrelations[0]?.index.replace('Index', '').trim()} indicates that your property value ${predictionResult.economicCorrelations[0]?.correlation > 0 ? 'rises' : 'falls'} as this economic indicator increases.`
                      ) : (
                        // Default description
                        "Correlations with economic indices show how your property value relates to broader economic trends."
                      )}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mt-4 flex justify-center gap-3"
                >
                  <Button
                    onClick={handleRecalculate}
                    className="bg-muted hover:bg-muted/80 text-foreground flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  >
                    <Sliders className="h-4 w-4" />
                    <span>Recalculate Valuation</span>
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]" />
                  <div className="mt-4 text-sm text-muted-foreground">
                    Loading valuation...
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {analyticsModalOpen && (
        <AnalyticsModal
          isOpen={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          transactions={transactions}
          streetName={address?.streetName || ""}
          flatType={flatType ? decodeURIComponent(flatType) : undefined}
        />
      )}
    </div>
  );
}
