import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
  try {
    const prompt = `Analyze the sentiment of this news headline and snippet about property in Singapore. Respond with ONLY one word: "positive", "negative", or "neutral".
    
    Text: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim().toLowerCase();
    
    if (response.includes('positive')) return 'positive';
    if (response.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 'neutral';
  }
}

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
    
    const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(area)}+singapore+property&tbm=nws&tbs=qdr:m&location=Singapore&api_key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from SerpAPI');
    }
    
    const data = await response.json();
    
    // Only process the top 5 stories
    if (data.news_results && data.news_results.length > 0) {
      const topStories = data.news_results.slice(0, 5);
      
      // Analyze sentiment for each story
      for (const story of topStories) {
        const textToAnalyze = `${story.title} ${story.snippet || ''}`;
        story.sentiment = await analyzeSentiment(textToAnalyze);
      }
      
      // Replace the original news_results with our processed ones
      data.news_results = topStories;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Top Stories API:', error);
    return NextResponse.json({ error: 'Failed to fetch Top Stories data' }, { status: 500 });
  }
} 