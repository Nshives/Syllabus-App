import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "❌ No API Key found in .env.local" });
  }

  // We hit the raw Google API endpoint to list available models
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // If Google sends back an error (like "Project not linked"), show it
    if (data.error) {
      return NextResponse.json({ 
        status: "❌ Google Refused Connection", 
        details: data.error 
      }, { status: 400 });
    }

    // Filter to show only the text generation models we care about
    const availableModels = data.models
      ? data.models
          .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => m.name)
      : "No models found";

    return NextResponse.json({ 
      status: "✅ Connection Successful", 
      your_valid_models: availableModels 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}