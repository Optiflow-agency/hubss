// Email Notification Edge Function for HUBSS
// Sends transactional emails via Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@hubss.app';

interface EmailPayload {
  type: 'task_assigned' | 'mention' | 'daily_digest' | 'ticket_update' | 'welcome';
  userId: string;
  data: Record<string, unknown>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email templates
const templates: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  task_assigned: (data) => ({
    subject: `[HUBSS] Nuova attività: ${data.taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Nuova Attività Assegnata</h1>
            </div>
            <div class="content">
              <p>Ciao ${data.userName},</p>
              <p><strong>${data.assignedBy}</strong> ti ha assegnato una nuova attività:</p>
              <h2 style="color: #6366f1;">${data.taskTitle}</h2>
              <p><strong>Progetto:</strong> ${data.boardTitle}</p>
              ${data.dueDate ? `<p><strong>Scadenza:</strong> ${data.dueDate}</p>` : ''}
              ${data.description ? `<p>${data.description}</p>` : ''}
              <a href="${data.taskUrl}" class="button">Visualizza Attività</a>
            </div>
            <div class="footer">
              <p>HUBSS - La tua piattaforma di collaborazione</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  mention: (data) => ({
    subject: `[HUBSS] ${data.mentionedBy} ti ha menzionato`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Nuova Menzione</h1>
            </div>
            <div class="content">
              <p>Ciao ${data.userName},</p>
              <p><strong>${data.mentionedBy}</strong> ti ha menzionato in <strong>#${data.channelName}</strong>:</p>
              <div class="message-box">
                ${data.messageContent}
              </div>
              <a href="${data.messageUrl}" class="button">Vai al Messaggio</a>
            </div>
            <div class="footer">
              <p>HUBSS - La tua piattaforma di collaborazione</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  daily_digest: (data) => ({
    subject: `[HUBSS] Riepilogo giornaliero - ${data.date}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .stat-box { display: inline-block; background: white; padding: 15px 25px; border-radius: 8px; margin: 10px; text-align: center; }
            .stat-number { font-size: 32px; font-weight: bold; color: #6366f1; }
            .task-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .task-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Riepilogo Giornaliero</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.date}</p>
            </div>
            <div class="content">
              <p>Ciao ${data.userName},</p>
              <p>Ecco il tuo riepilogo di oggi:</p>

              <div style="text-align: center; margin: 20px 0;">
                <div class="stat-box">
                  <div class="stat-number">${data.tasksCompleted}</div>
                  <div>Task completati</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.tasksPending}</div>
                  <div>In attesa</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.hoursLogged}</div>
                  <div>Ore registrate</div>
                </div>
              </div>

              ${data.upcomingTasks?.length > 0 ? `
                <h3>Task in scadenza</h3>
                <div class="task-list">
                  ${data.upcomingTasks.map((task: { title: string; dueDate: string }) => `
                    <div class="task-item">
                      <strong>${task.title}</strong><br>
                      <small style="color: #6b7280;">Scadenza: ${task.dueDate}</small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <a href="${data.dashboardUrl}" class="button">Vai alla Dashboard</a>
            </div>
            <div class="footer">
              <p>HUBSS - La tua piattaforma di collaborazione</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  welcome: (data) => ({
    subject: `Benvenuto in HUBSS, ${data.userName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .feature { display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
            .feature-icon { font-size: 24px; margin-right: 15px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Benvenuto in HUBSS!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">La tua piattaforma di collaborazione all-in-one</p>
            </div>
            <div class="content">
              <p>Ciao <strong>${data.userName}</strong>,</p>
              <p>Siamo entusiasti di averti a bordo! HUBSS ti aiuterà a gestire progetti, collaborare con il team e comunicare con i clienti.</p>

              <h3>Cosa puoi fare con HUBSS:</h3>
              <div class="feature">
                <span class="feature-icon">📋</span>
                <div><strong>Gestione Progetti</strong> - Board Kanban, task e tracking del tempo</div>
              </div>
              <div class="feature">
                <span class="feature-icon">💬</span>
                <div><strong>Chat Team</strong> - Canali, messaggi diretti e AI assistant</div>
              </div>
              <div class="feature">
                <span class="feature-icon">👥</span>
                <div><strong>Portale Clienti</strong> - Condivisione file e gestione ticket</div>
              </div>
              <div class="feature">
                <span class="feature-icon">📊</span>
                <div><strong>Dashboard</strong> - Analytics e report in tempo reale</div>
              </div>

              <div style="text-align: center;">
                <a href="${data.dashboardUrl}" class="button">Inizia Ora</a>
              </div>
            </div>
            <div class="footer">
              <p>HUBSS - La tua piattaforma di collaborazione</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  ticket_update: (data) => ({
    subject: `[HUBSS] Aggiornamento ticket: ${data.ticketSubject}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .status-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
            .status-received { background: #fef3c7; color: #92400e; }
            .status-working { background: #dbeafe; color: #1e40af; }
            .status-completed { background: #d1fae5; color: #065f46; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Aggiornamento Ticket</h1>
            </div>
            <div class="content">
              <p>Ciao ${data.userName},</p>
              <p>Il tuo ticket è stato aggiornato:</p>
              <h2 style="color: #6366f1;">${data.ticketSubject}</h2>
              <p>
                <strong>Nuovo stato:</strong>
                <span class="status-badge ${data.status === 'Ricevuta' ? 'status-received' : data.status === 'In Lavorazione' ? 'status-working' : 'status-completed'}">
                  ${data.status}
                </span>
              </p>
              ${data.comment ? `<p><strong>Commento:</strong> ${data.comment}</p>` : ''}
              <a href="${data.ticketUrl}" class="button">Visualizza Ticket</a>
            </div>
            <div class="footer">
              <p>HUBSS - La tua piattaforma di collaborazione</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, userId, data } = await req.json() as EmailPayload;

    if (!type || !userId || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, userId, data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const template = templates[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown email type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email from Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ error: 'User not found or has no email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email content
    const { subject, html } = template({ ...data, userName: profile.name });

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: profile.email,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
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
