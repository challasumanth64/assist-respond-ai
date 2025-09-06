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
    console.log('Simulating Gmail email fetch for user:', user_id);

    // For now, let's create some demo emails to simulate Gmail fetching
    // In production, you would implement proper Gmail API integration
    const demoEmails = [
      {
        sender_email: "customer1@example.com",
        subject: "Need help with your service",
        body: "Hi, I'm having trouble accessing my account. Can you please help me reset my password? This is urgent as I need to access important documents for my work today.",
        received_at: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        user_id: user_id
      },
      {
        sender_email: "support@clientcompany.com", 
        subject: "Integration questions",
        body: "Hello, we're trying to integrate your API into our system but we're getting authentication errors. Could you provide some guidance on the proper implementation? We've been stuck on this for a few days now.",
        received_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        user_id: user_id
      }
    ];

    console.log(`Processing ${demoEmails.length} simulated emails`);

    // Process each demo email through the existing process-email function
    let processedCount = 0;
    for (const email of demoEmails) {
      try {
        // Check if this email already exists
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('sender_email', email.sender_email)
          .eq('subject', email.subject)
          .eq('user_id', user_id)
          .single();

        if (!existingEmail) {
          const { data, error } = await supabase.functions.invoke('process-email', {
            body: email
          });
          
          if (error) {
            console.error('Error processing email:', error);
          } else {
            processedCount++;
            console.log('Successfully processed email from:', email.sender_email);
          }
        } else {
          console.log('Email already exists, skipping:', email.subject);
        }
      } catch (processError) {
        console.error('Error processing email:', processError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Simulated Gmail sync: processed ${processedCount} new emails`,
      emailCount: processedCount,
      note: "This is a demo simulation. In production, this would connect to Gmail API to fetch real emails."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Gmail simulation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});