// AI Proxy Edge Function for HUBSS
// Securely proxies requests to Google Gemini API with rate limiting

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Rate limiting: 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client to verify user
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { message, context, channelId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile and workspace context
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, workspace_id')
      .eq('id', user.id)
      .single();

    // Build context for AI
    let systemContext = `Sei un assistente AI per HUBSS, una piattaforma di collaborazione aziendale.
L'utente che sta parlando si chiama ${profile?.name || 'Utente'}.
Rispondi sempre in italiano in modo professionale ma amichevole.
Puoi aiutare con:
- Gestione progetti e task
- Organizzazione del lavoro
- Domande sui clienti
- Suggerimenti per la produttività
- Rispondere a domande generali`;

    // Add additional context if provided
    if (context) {
      if (context.boards) {
        systemContext += `\n\nProgetti attivi: ${JSON.stringify(context.boards)}`;
      }
      if (context.clients) {
        systemContext += `\n\nClienti: ${JSON.stringify(context.clients)}`;
      }
      if (context.team) {
        systemContext += `\n\nTeam: ${JSON.stringify(context.team)}`;
      }
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemContext }],
            },
            {
              role: 'model',
              parts: [{ text: 'Capito! Sono pronto ad aiutarti. Come posso assisterti oggi?' }],
            },
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const aiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Mi dispiace, non sono riuscito a generare una risposta.';

    // Log the interaction for analytics (optional)
    await supabase.from('audit_logs').insert({
      workspace_id: profile?.workspace_id,
      user_id: user.id,
      action: 'ai_chat',
      entity_type: 'ai_interaction',
      new_values: { message_length: message.length, response_length: aiContent.length },
    });

    return new Response(
      JSON.stringify({ content: aiContent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
