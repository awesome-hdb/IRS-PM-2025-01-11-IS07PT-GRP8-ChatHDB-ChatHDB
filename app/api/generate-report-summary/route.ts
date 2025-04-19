import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY || '';
if (!API_KEY) {
  console.warn('GEMINI_API_KEY is not set in environment variables!');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(request: NextRequest) {
  try {
    console.log('Report summary generation request received');
    
    // Validate request
    if (!request.body) {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }
    
    const body = await request.json().catch(() => ({}));
    const { propertyInfo } = body;
    
    if (!propertyInfo) {
      return NextResponse.json({ error: 'Property information is required' }, { status: 400 });
    }
    
    // Check if this is a news summary request
    if (propertyInfo.reportType === 'news_summary') {
      return generateNewsSummary(propertyInfo);
    }
    
    // Validate required fields
    const requiredFields = ['address', 'flatType'];
    const missingFields = requiredFields.filter(field => !propertyInfo[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }
    
    // Create a summarized version of the property info for logging
    const loggableInfo = {
      address: propertyInfo.address?.substring(0, 30) + '...',
      flatType: propertyInfo.flatType,
      hasValuation: !!propertyInfo.valuationAmount,
      transactionCount: propertyInfo.transactions,
      includesMarketData: !!propertyInfo.includeMarketAnalytics
    };
    console.log('Generating summary for property:', loggableInfo);
    
    // Check if API key is set
    if (!API_KEY) {
      return NextResponse.json({ 
        summary: 'Property summary could not be generated due to API configuration issues. This property is located at ' +
                propertyInfo.address + ' and is a ' + propertyInfo.flatType + ' type unit.'
      });
    }

    // Create the prompt for the AI based on available data
    let prompt = `You are a professional property analyst. Write a comprehensive analysis of this HDB property valuation report:
    
    Property: ${propertyInfo.address}
    Flat Type: ${propertyInfo.flatType}
    Estimated Value: ${propertyInfo.valuationAmount}
    Price per SQM: ${propertyInfo.pricePerSqm}
    Based on: ${propertyInfo.transactions} recent transactions
    Key factors: ${propertyInfo.keyFactors}
    Prediction range: ${propertyInfo.predictionRange}
    Nearby amenities: ${propertyInfo.amenities}
    `;
    
    // Add economic and market data if available
    if (propertyInfo.economicCorrelations) {
      prompt += `
    Economic correlations: ${propertyInfo.economicCorrelations}
    Economic trend impact: ${propertyInfo.economicMultiplier}
    Recent market trend: ${propertyInfo.marketTrends}
    `;
    }
    
    // Add instructions for the format and content
    prompt += `
    Create a detailed 4-paragraph professional property analysis with the following structure:
    
    Paragraph 1: Summarize the property details and estimated valuation.
    
    Paragraph 2: Analyze the key factors influencing the valuation with percentages and their impact on value. Explain which factors have the most significant influence on the property value and why.
    
    Paragraph 3: Provide insights into economic correlations and market trends. Explain how economic indicators like GDP, Rental Index, and others are affecting property values in this area, along with multipliers used in adjusted market value calculations.
    
    Paragraph 4: Give a brief market outlook based on the data, surrounding amenities, and ongoing market trends.
    `;
    
    // Add instructions for formatting if requested
    if (propertyInfo.includeFormattedText) {
      prompt += `
    
    Format your response with clarity and professionalism:
    - Use **bold text** ONLY for key metrics, values, and important terms (use sparingly)
    - Write well-structured paragraphs with 3-4 sentences each
    - Use short, clear sentences - avoid complex or compound sentences
    - Include specific figures where available (e.g., exact percentages, correlations)
    - Do not include section headings or titles - just the formatted paragraphs
    - Keep paragraphs short and focused on one main point each
    `;
    }
    
    // Add final guidance
    prompt += `
    
    Keep your analysis factual, professional, and based strictly on the provided data. Provide concrete insights derived from the data without speculative language. Use formatting conservatively - only bold truly key terms or values.`;
    
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI request timed out')), 12000)
        )
      ]) as any;
      
      if (!result || !result.response) {
        throw new Error('Empty response from AI model');
      }
      
      const summary = result.response.text().trim();
      console.log('AI summary generated successfully, length:', summary.length);
      
      return NextResponse.json({ summary });
    } catch (aiError: any) {
      console.error('AI generation error:', aiError?.message || aiError);
      
      // Return a fallback summary
      return NextResponse.json({ 
        summary: `This **${propertyInfo.flatType}** flat is located at **${propertyInfo.address}**. The estimated value is **${propertyInfo.valuationAmount || 'not available'}** based on ${propertyInfo.transactions || 0} recent transactions. Key factors affecting the value include ${propertyInfo.keyFactors || 'various aspects of the property'}. The property is conveniently located near ${propertyInfo.amenities || 'various amenities'}.

${propertyInfo.economicCorrelations ? `Economic indicators show correlations with ${propertyInfo.economicCorrelations}. Current market trends indicate ${propertyInfo.marketTrends || 'stable conditions'}.` : ''}

Based on all available data, this property represents a typical ${propertyInfo.flatType} unit in the area with standard valuation metrics.`
      });
    }
  } catch (error: any) {
    console.error('Error in report summary generation:', error);
    return NextResponse.json({ error: 'Failed to generate report summary: ' + (error?.message || 'Unknown error') }, { status: 500 });
  }
}

// Function to generate news summary
async function generateNewsSummary(propertyInfo: any) {
  try {
    console.log(`Generating news summary for ${propertyInfo.area || 'property area'}`);
    
    if (!API_KEY) {
      return NextResponse.json({ 
        summary: `No recent news summary available for ${propertyInfo.area || 'this area'}.`
      });
    }
    
    const area = propertyInfo.area || 'Singapore HDB property market';
    
    const prompt = `You are a professional property market analyst. Write a concise summary of recent news affecting the property market in ${area}, Singapore.
    
    Focus on recent developments (last 3-6 months) that could impact property values in this specific location, such as:
    
    1. Government policies affecting HDB resale market
    2. Infrastructure developments near ${area}
    3. Economic factors influencing property values
    4. Notable transactions or market trends in ${area}
    5. Any new amenities or facilities being developed
    
    Format your response as 2-3 short, concise paragraphs with the most relevant recent news for this property area.
    Each paragraph should be 2-3 sentences maximum and focus on one main point.
    If you don't have specific recent news about ${area}, provide general Singapore HDB market news that would be relevant to property owners in this area.
    
    Use clear, simple language. Write in a factual, journalistic style without speculative language. Keep the total response under 150 words.`;
    
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI request timed out')), 8000)
        )
      ]) as any;
      
      if (!result || !result.response) {
        throw new Error('Empty response from AI model');
      }
      
      const summary = result.response.text().trim();
      console.log('News summary generated successfully, length:', summary.length);
      
      return NextResponse.json({ summary });
    } catch (aiError: any) {
      console.error('News summary generation error:', aiError?.message || aiError);
      
      // Return a fallback summary
      return NextResponse.json({ 
        summary: `Recent HDB market trends in Singapore continue to show resilience. Government policies and infrastructure developments in various areas including ${area} have been influencing property values. Prospective buyers and current owners should monitor upcoming policy announcements and local development plans for potential impact on property values.`
      });
    }
  } catch (error: any) {
    console.error('Error in news summary generation:', error);
    return NextResponse.json({ 
      summary: `Unable to generate news summary for ${propertyInfo.area || 'this area'} at this time.`
    });
  }
} 