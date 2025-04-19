import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const area = searchParams.get('area');
  
  if (!area) {
    return NextResponse.json({ error: 'Area parameter is required' }, { status: 400 });
  }

  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      throw new Error('SERPAPI_KEY environment variable is not set');
    }
    
    const response = await fetch(`https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(area)}&date=today 3-m&geo=SG&api_key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from SerpAPI');
    }
    
    const data = await response.json();
    
    if (data.interest_over_time && data.interest_over_time.timeline_data) {
      const monthlyData = data.interest_over_time.timeline_data.reduce((acc: any, point: any) => {
        const date = new Date(point.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthYear]) {
          acc[monthYear] = {
            count: 0,
            total: 0,
            month: new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          };
        }
        
        acc[monthYear].count += 1;
        acc[monthYear].total += point.values[0].extracted_value;
        
        return acc;
      }, {});
      
      const monthlyArray = Object.values(monthlyData).map((item: any) => ({
        date: item.month,
        value: Math.round(item.total / item.count)
      }));
      
      data.interest_over_time.monthly_data = monthlyArray;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Google Trends API:', error);
    return NextResponse.json({ error: 'Failed to fetch Google Trends data' }, { status: 500 });
  }
} 