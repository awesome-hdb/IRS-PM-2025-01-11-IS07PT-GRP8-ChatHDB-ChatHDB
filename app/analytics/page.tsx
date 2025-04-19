"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Building2, MapPin, DollarSign, Calendar } from "lucide-react";

// Dummy data for analytics
const marketTrends = {
  currentMonth: {
    averagePrice: 580000,
    change: 2.5,
    transactions: 45,
    pricePerSqm: 6236,
  },
  previousMonth: {
    averagePrice: 565000,
    transactions: 38,
    pricePerSqm: 6085,
  },
};

const priceRangeDistribution = [
  { range: "400k - 450k", count: 5 },
  { range: "450k - 500k", count: 12 },
  { range: "500k - 550k", count: 18 },
  { range: "550k - 600k", count: 25 },
  { range: "600k - 650k", count: 15 },
  { range: "650k - 700k", count: 8 },
];

const recentTransactions = [
  {
    id: 1,
    address: "Block 123, Tampines Street 11",
    price: 550000,
    date: "2024-02-15",
    type: "4 Room",
    sqm: 93,
  },
  {
    id: 2,
    address: "Block 456, Tampines Street 12",
    price: 620000,
    date: "2024-02-10",
    type: "5 Room",
    sqm: 110,
  },
  {
    id: 3,
    address: "Block 789, Tampines Street 45",
    price: 588000,
    date: "2024-01-28",
    type: "4 Room",
    sqm: 93,
  },
];

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Market Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of HDB resale market trends in Tampines
          </p>
        </motion.div>

        {/* Market Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Average Price</h3>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-2">
              ${marketTrends.currentMonth.averagePrice.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+{marketTrends.currentMonth.change}% from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Price per SQM</h3>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-2">
              ${marketTrends.currentMonth.pricePerSqm.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+2.5% from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mb-2">
              {marketTrends.currentMonth.transactions}
            </div>
            <div className="flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+18.4% from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Market Sentiment</h3>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold mb-2">Positive</div>
            <div className="text-sm text-muted-foreground">
              Based on recent trends
            </div>
          </Card>
        </motion.div>

        {/* Price Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Price Range Distribution</h2>
            <div className="space-y-4">
              {priceRangeDistribution.map((range) => (
                <div key={range.range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{range.range}</span>
                    <span className="font-medium">{range.count} units</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(range.count / 25) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between pb-4 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">{transaction.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.type} • {transaction.sqm} sqm
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      ${transaction.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}