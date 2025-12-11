import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
// Note: In a real production app, API keys should be handled via backend proxies.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Edits a product image based on a user prompt using Gemini 2.5 Flash Image.
 * This corresponds to the "Nano banana powered app" requirement.
 */
export const editProductImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    // Ensure base64 string is clean (remove data:image/...;base64, prefix if present for the API, 
    // although @google/genai usually handles raw base64 in inlineData nicely if mimeType is correct)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming standard jpeg for photos
              data: cleanBase64
            }
          },
          {
            text: `Edit this image: ${prompt}. Return only the edited image.`
          }
        ]
      }
    });

    // Extract the image from the response
    // The response might contain text or image. We iterate to find the image.
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const resultBase64 = part.inlineData.data;
          return `data:image/png;base64,${resultBase64}`;
        }
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    throw error;
  }
};
