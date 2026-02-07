
import { GoogleGenAI } from "@google/genai";
import { Board, Client, User } from "../types";

interface AIContext {
    boards: Board[];
    clients: Client[];
    team: User[];
}

export const generateAIResponse = async (prompt: string, context?: AIContext): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    return "Mi dispiace, ma non riesco ad accedere alla mia memoria al momento (API Key mancante). Configura VITE_GEMINI_API_KEY nel file .env.local.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct a rich system instruction based on real-time data
    let contextString = "";
    if (context) {
        const projectSummaries = context.boards.map(b => {
            const taskStats = {
                total: b.tasks.length,
                done: b.tasks.filter(t => t.status === 'done').length,
                todo: b.tasks.filter(t => t.status === 'todo').length
            };
            return `- Progetto "${b.title}": ${taskStats.done}/${taskStats.total} task completati. Task aperti: ${b.tasks.map(t => t.title).join(', ')}.`;
        }).join('\n');

        const clientList = context.clients.map(c => `- ${c.company} (Referente: ${c.name})`).join('\n');

        contextString = `
        DATI ATTUALI DEL WORKSPACE:
        
        CLIENTI:
        ${clientList}

        PROGETTI ATTIVI & STATO TASK:
        ${projectSummaries}
        `;
    }

    const systemInstruction = `
    Sei Hubss AI, un Project Manager virtuale di altissimo livello integrato in questa piattaforma.
    
    IL TUO OBIETTIVO:
    Aiutare l'utente a gestire il lavoro, analizzare i progetti e fornire insight basati sui DATI REALI forniti qui sotto.

    ${contextString}

    REGOLE DI COMPORTAMENTO:
    1. Rispondi sempre in ITALIANO.
    2. Sii conciso, professionale ma proattivo.
    3. Se l'utente chiede "come sta andando il progetto X?", analizza i dati dei task forniti e dai una risposta basata sui numeri (es. "Il progetto X è al 50%, ci sono ancora task critici come...").
    4. Se ti viene chiesto di creare un task, spiega che puoi guidarli ma devono usare il bottone "+" nella chat per farlo effettivamente.
    5. Usa la formattazione Markdown (grassetto, liste) per rendere la risposta leggibile.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Non sono riuscito a generare una risposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ho riscontrato un errore durante l'elaborazione della tua richiesta.";
  }
};
