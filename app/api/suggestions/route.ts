import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;
    const pdfContent = body.pdfContent || null;
    
    let promptPrefix = '';
    let defaultSuggestions = ["Tell me more about this topic", "How can I implement this?", "What are the alternatives?"];
    
    if (pdfContent) {
      promptPrefix = `You are generating follow-up questions about a property valuation report conversation. `;
      defaultSuggestions = [
        "Explain my property valuation", 
        "What affects my property value?", 
        "Compare with nearby properties"
      ];
    } else {
      promptPrefix = `You are generating follow-up questions about Singapore HDB properties. `;
    }
    
    const prompt = `
${promptPrefix}
Based on the following assistant response, generate exactly 3 follow-up questions that a user might want to ask next. 
Make the questions concise (under 10 words each), specific to the content, and diverse in focus.
Format your response as a JSON array of strings, with no additional text.

Assistant's response:
${message}

Example output format:
["Question 1?", "Question 2?", "Question 3?"]
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Try to parse the response as JSON
    try {
      // The model should return a JSON array, but sometimes it might include markdown formatting
      // This regex extracts content between square brackets, including the brackets
      const jsonMatch = text.match(/\[([\s\S]*?)\]/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const suggestions = JSON.parse(jsonStr);
        
        // Ensure we have exactly 3 suggestions
        const validSuggestions = Array.isArray(suggestions) 
          ? suggestions.slice(0, 3) 
          : defaultSuggestions;
          
        // If we have fewer than 3, add some defaults
        while (validSuggestions.length < 3) {
          validSuggestions.push(defaultSuggestions[validSuggestions.length % defaultSuggestions.length]);
        }
        
        return NextResponse.json({ suggestions: validSuggestions });
      }
    } catch (error) {
      console.error("Error parsing suggestions:", error);
    }
    
    // Fallback to default suggestions if parsing fails
    return NextResponse.json({ suggestions: defaultSuggestions });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate suggestions",
        suggestions: [
          "Tell me more about this topic", 
          "How can I implement this?", 
          "What are the alternatives?"
        ] 
      },
      { status: 500 }
    );
  }
} 