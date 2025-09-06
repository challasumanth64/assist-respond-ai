import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { user_id } = await req.json();
    console.log('Fetching Gmail emails for user:', user_id);

    // Get Gmail access token from user's auth session
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_PASSWORD');

    if (!gmailUser || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    // For now, we'll use a simple IMAP connection to fetch emails
    // In production, you'd want to use Gmail API for better reliability
    const { IMAPClient } = await import("https://deno.land/x/imap@1.0.1/mod.ts");
    
    const client = new IMAPClient({
      hostname: "imap.gmail.com",
      port: 993,
      tls: true,
      auth: {
        username: gmailUser,
        password: gmailPassword,
      },
    });

    await client.connect();
    await client.select("INBOX");

    // Search for unread emails
    const messageIds = await client.search(["UNSEEN"]);
    console.log(`Found ${messageIds.length} unread emails`);

    const emails = [];
    
    // Fetch up to 10 most recent unread emails
    const recentIds = messageIds.slice(-10);
    
    for (const id of recentIds) {
      try {
        const message = await client.fetch(id, ["ENVELOPE", "BODY.PEEK[]"]);
        const envelope = message.envelope;
        const body = message.body;

        // Extract email details
        const senderEmail = envelope.from[0].mailbox + "@" + envelope.from[0].host;
        const subject = envelope.subject || "No Subject";
        const receivedAt = envelope.date || new Date();

        // Simple body text extraction (you might want to improve this)
        let bodyText = "";
        if (typeof body === 'string') {
          bodyText = body;
        } else if (body && body.text) {
          bodyText = body.text;
        }

        // Check if this email is already in our database
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('sender_email', senderEmail)
          .eq('subject', subject)
          .eq('user_id', user_id)
          .single();

        if (!existingEmail) {
          emails.push({
            sender_email: senderEmail,
            subject: subject,
            body: bodyText,
            received_at: receivedAt,
            user_id: user_id
          });
        }

        // Mark as read
        await client.store(id, "+FLAGS", ["\\Seen"]);
      } catch (emailError) {
        console.error('Error processing email:', emailError);
        continue;
      }
    }

    await client.close();

    console.log(`Processing ${emails.length} new emails`);

    // Process each new email through the existing process-email function
    for (const email of emails) {
      try {
        await supabase.functions.invoke('process-email', {
          body: email
        });
      } catch (processError) {
        console.error('Error processing email:', processError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Fetched and processed ${emails.length} new emails`,
      emailCount: emails.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching Gmail emails:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});