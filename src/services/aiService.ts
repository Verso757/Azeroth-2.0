import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function suggestResolution(issueTitle: string, issueDescription: string, areaName: string, category: string): Promise<string> {
  try {
    const prompt = `
Eres un experto en soporte técnico y administración operativa.
Analiza la siguiente incidencia reportada y sugiere una posible solución o plan de acción paso a paso para el agente que la va a atender. 
La sugerencia debe ser clara, profesional, concisa y fácil de copiar como una resolución del ticket.
No incluyas saludos largos, ve directo al grano de la resolución.

Título: ${issueTitle}
Descripción: ${issueDescription}
Área: ${areaName} 
Categoría sugerida: ${category || 'Ninguna'}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    return response.text || "No se pudo generar una sugerencia.";
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("No se pudo contactar a la Inteligencia Artificial.");
  }
}

export async function suggestCatalogItems(catalogName: string, existingItems: string[], description: string = ""): Promise<string[]> {
  try {
    const prompt = `
Eres un asistente experto para poblar catálogos en un sistema ERP.
El usuario quiere generar de 3 a 5 nuevas opciones para el catálogo: "${catalogName}".
${description ? `Contexto o tarea específica del usuario: ${description}` : ''}

Evita incluir las opciones que ya existen: [${existingItems.join(', ')}].

Devuelve ÚNICAMENTE un array JSON válido de strings. Sin markdown y sin otro texto, por ejemplo:
["Opción 1", "Opción 2", "Opción 3"]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    const text = response.text || "[]";
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("AI Error:", error);
    return [];
  }
}
