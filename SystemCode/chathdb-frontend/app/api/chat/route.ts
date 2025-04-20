import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig,
});

export async function POST(request: Request) {
  console.log('API route hit');

  try {
    const body = await request.json();
    const message = body.message;
    const pdfContent = body.pdfContent || null;
    
    console.log('Received message:', message);
    console.log('PDF content available:', !!pdfContent);

    // Create initial history with or without PDF context
    const history = [];
    
    if (pdfContent) {
      // If PDF content is available, add it as context
      history.push({
        role: "user",
        parts: [{
          text: "You are a helpful assistant specializing in Singapore HDB property information. You'll be answering questions about a property valuation report. Keep answers short and concise. Format responses using markdown with only **important terms** in bold. Avoid lengthy explanations and unnecessary details. Use bullet points for lists where appropriate. Limit responses to 2-3 sentences per paragraph maximum."
        }]
      });
      
      history.push({
        role: "model",
        parts: [{
          text: "Understood. I'll provide concise answers about HDB property valuation using the report data, with key terms in bold."
        }]
      });
      
      // Add PDF content as context
      history.push({
        role: "user",
        parts: [{
          text: `Here's the content of a property valuation report. Use this information to answer my questions:\n\n${pdfContent}`
        }]
      });
      
      history.push({
        role: "model",
        parts: [{
          text: "Thank you for sharing the property valuation report. I'll use this information to answer your questions specifically about this property."
        }]
      });
    } else {
      // Standard HDB assistant without PDF context
      history.push({
        role: "user",
        parts: [{
          text: "You are a helpful assistant specializing in Singapore HDB property information. Keep answers short and concise. Format responses using markdown with only **important terms** in bold. Avoid lengthy explanations and unnecessary details. Use bullet points for lists where appropriate. Limit responses to 2-3 sentences per paragraph maximum."
        }]
      });
      
      history.push({
        role: "model",
        parts: [{
          text: "Understood. I'll provide concise HDB information with only key terms in bold."
        }]
      });
    }

    const chat = model.startChat({
      generationConfig,
      history: history,
    });

    const result = await chat.sendMessageStream([{ text: message }]);
    
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          // Clean any <br> tags that might come from the AI response
          const cleanedText = text.replace(/<br>/g, '\n');
          controller.enqueue(cleanedText);
        }
        controller.close();
      },
    });

    return new Response(stream);
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return NextResponse.json(
      { error: 'Failed to process request: ' + error.message },
      { status: 500 }
    );
  }
}
