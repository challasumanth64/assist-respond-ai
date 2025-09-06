import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response_id, final_response, recipient_email } = await req.json();
    console.log('Sending response:', { response_id, recipient_email });

    // Update response as sent
    const { data: responseData, error: updateError } = await supabase
      .from('responses')
      .update({
        edited_response: final_response,
        sent: true,
        sent_at: new Date().toISOString()
      })
      .eq('id', response_id)
      .select(`
        *,
        emails (
          sender_email,
          subject,
          user_id
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating response:', updateError);
      throw updateError;
    }

    // Update email as processed
    await supabase
      .from('emails')
      .update({ processed: true })
      .eq('id', responseData.email_id);

    // Update analytics - move from pending to resolved
    const today = new Date().toISOString().split('T')[0];
    const { data: analytics } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', responseData.emails.user_id)
      .eq('date', today)
      .single();

    if (analytics) {
      await supabase
        .from('analytics')
        .update({
          resolved_emails: (analytics.resolved_emails || 0) + 1,
          pending_emails: Math.max((analytics.pending_emails || 1) - 1, 0)
        })
        .eq('id', analytics.id);
    }

    // Send actual email via Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 587,
        tls: true,
        auth: {
          username: Deno.env.get('GMAIL_USER'),
          password: Deno.env.get('GMAIL_PASSWORD'),
        },
      },
    });

    await client.send({
      from: Deno.env.get('GMAIL_USER'),
      to: recipient_email,
      subject: `Re: ${responseData.emails.subject}`,
      content: final_response,
    });

    await client.close();
    
    console.log(`Email sent to ${recipient_email} via Gmail SMTP`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Response sent successfully',
      response: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending response:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});