import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ScriptGenerationParams {
  toolName: string;
  toolUrl: string;
  description: string;
  targetAudience: string[];
  duration: string | number;
  category: string;
  goal: string;
  scriptType: 'podcast' | 'solo' | 'voiceover' | 'testimonial';
}

export const generateScripts = async (params: ScriptGenerationParams) => {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    Ești un expert în copywriting și marketing video pentru S Society Hub.
    Sarcina ta este să generezi 3 variante de script (A: Direct, B: Story, C: Hook) în limba ROMÂNĂ.
    
    PROFILE SPEAKERI:
    - ALINA (Host): Female, asks questions, curious and professional. She is the bridge between the audience and the technology.
    - SERGIU (Brand Voice): Male, calm, honest, uses specific data, never oversells. He is the expert founder who explains things simply and truthfully.
    
    REGULI CRITICE:
    1. Format: "ALINA: Text" sau "SERGIU: Text".
    2. Toate numerele trebuie scrise în cuvinte (ex: "două mii" nu "2000") pentru compatibilitate TTS.
    3. Include markeri de pauză "..." pentru ritm natural.
    4. Include o poveste de client relevantă din baza de date (Maria, Andrei, Cristina, Mihai etc. în funcție de categorie).
    5. Menționează ecosistemul "S Society Hub".
    6. CTA clar la final.
    7. Gramatică română impecabilă, fără abrevieri.
    8. Durata țintă: ${params.duration} secunde.
    
    STRUCTURĂ PODCAST (dacă e tipul podcast):
    - 00:00-00:10 | HOOK
    - 00:10-00:25 | INTRO + GUEST
    - 00:25-00:50 | PROBLEM + SOLUTION
    - 00:50-01:30 | DEMO + FEATURES
    - 01:30-02:00 | CLIENT STORY
    - 02:00-02:30 | WHY INCREMENTAL
    - 02:30-03:00 | CTA + CLOSE
  `;

  const prompt = `
    Generează 3 variante de script pentru produsul:
    Nume: ${params.toolName}
    URL: ${params.toolUrl}
    Descriere: ${params.description}
    Audiență: ${params.targetAudience.join(', ')}
    Categorie: ${params.category}
    Scop: ${params.goal}
    Tip Script: ${params.scriptType}
    Durată: ${params.duration} secunde
    
    Returnează un obiect JSON cu 3 chei: "variationA", "variationB", "variationC".
    Fiecare variantă trebuie să aibă: "title", "content" (scriptul propriu-zis), "estimatedDuration" și "platformRecommendation".
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variationA: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                estimatedDuration: { type: Type.NUMBER },
                platformRecommendation: { type: Type.STRING }
              },
              required: ["title", "content", "estimatedDuration", "platformRecommendation"]
            },
            variationB: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                estimatedDuration: { type: Type.NUMBER },
                platformRecommendation: { type: Type.STRING }
              },
              required: ["title", "content", "estimatedDuration", "platformRecommendation"]
            },
            variationC: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                estimatedDuration: { type: Type.NUMBER },
                platformRecommendation: { type: Type.STRING }
              },
              required: ["title", "content", "estimatedDuration", "platformRecommendation"]
            }
          },
          required: ["variationA", "variationB", "variationC"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Script Generation Error:", error);
    throw error;
  }
};

export const generateThumbnails = async (prompt: string, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9") => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: `Create a high-quality professional marketing thumbnail for: ${prompt}. Style: Modern, clean, high-contrast, tech-focused.` }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: "1K"
        }
      }
    });

    const images: string[] = [];
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
      }
    }
    return images;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

export const generateSEO = async (toolData: any) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate SEO content for a marketing video about "${toolData.name}". 
      Description: ${toolData.description}
      Target Audience: ${toolData.audience.join(', ')}
      
      Return a JSON object with:
      - titles: array of 5 catchy YouTube/Social titles
      - description: a long SEO-optimized description
      - hashtags: array of 15 relevant hashtags
      - keywords: array of 10 focus keywords`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["titles", "description", "hashtags", "keywords"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini SEO Generation Error:", error);
    throw error;
  }
};
