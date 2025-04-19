import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface FeatureImportanceChartProps {
  topFactors: FeatureImportance[];
  modelName: string;
}

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ topFactors, modelName }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Format feature names for display
  const formatFeatureName = (name: string) => {
    // Handle one-hot encoded features
    if (name.includes('_')) {
      const parts = name.split('_');
      return `${parts[0]} (${parts.slice(1).join(' ')})`;
    }
    
    // Handle regular features
    return name
      .replace('floor_area_sqm', 'Floor Area')
      .replace('storey_avg', 'Storey Level')
      .replace('remaining_lease', 'Remaining Lease')
      .replace('lease_commence_date', 'Lease Start Year')
      .replace('year', 'Transaction Year')
      .replace('month_num', 'Month');
  };
  
  // Sort factors by importance
  const sortedFactors = [...topFactors]
    .sort((a, b) => b.importance - a.importance)
    .map(factor => ({
      feature: formatFeatureName(factor.feature),
      importance: factor.importance,
      formattedImportance: factor.importance.toFixed(4)
    }));
  
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
        fontSize: 12
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
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Importance</CardTitle>
        <CardDescription>
          The most influential factors in determining property value
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveBar
            data={sortedFactors}
            keys={['importance']}
            indexBy="feature"
            layout="horizontal"
            margin={{ top: 50, right: 50, bottom: 50, left: 180 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'blues' }}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Importance',
              legendPosition: 'middle',
              legendOffset: 32
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Feature',
              legendPosition: 'middle',
              legendOffset: -140
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelFormat={value => typeof value === 'number' ? value.toFixed(2) : value}
            tooltip={({ data }) => (
              <div className="bg-white dark:bg-gray-900 p-2 shadow-md rounded-md border dark:border-gray-700">
                <strong>{data.feature}</strong>
                <div>Importance: {data.formattedImportance}</div>
              </div>
            )}
            theme={chartTheme}
          />
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            <strong>What this means:</strong> The chart shows how much each feature influences the 
            property valuation in the {modelName.replace('_', ' ').toUpperCase()} model. 
            Higher values indicate stronger influence on the predicted price.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureImportanceChart; 