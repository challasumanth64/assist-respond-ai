import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { sender_email, subject, body, user_id } = await req.json();
    console.log('Processing email:', { sender_email, subject, user_id });

    // Check if email contains support keywords
    const supportKeywords = ['support', 'query', 'request', 'help'];
    const hasSupport = supportKeywords.some(keyword => 
      subject.toLowerCase().includes(keyword) || body.toLowerCase().includes(keyword)
    );

    if (!hasSupport) {
      return new Response(JSON.stringify({ 
        processed: false, 
        reason: 'No support keywords found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze sentiment and priority
    const { sentiment, priority, category, urgencyKeywords, extractedInfo } = await analyzeEmail(subject, body);

    // Store email in database
    const { data: emailData, error: emailError } = await supabase
      .from('emails')
      .insert({
        user_id,
        sender_email,
        subject,
        body,
        sentiment,
        priority,
        category,
        urgency_keywords: urgencyKeywords,
        extracted_info: extractedInfo,
        processed: true
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error storing email:', emailError);
      throw emailError;
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(subject, body, sentiment, extractedInfo);

    // Store response
    const { data: responseData, error: responseError } = await supabase
      .from('responses')
      .insert({
        email_id: emailData.id,
        user_id,
        generated_response: aiResponse
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error storing response:', responseError);
      throw responseError;
    }

    // Update analytics
    await updateAnalytics(user_id, sentiment, priority);

    return new Response(JSON.stringify({
      processed: true,
      email: emailData,
      response: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeEmail(subject: string, body: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  const prompt = `Analyze this email for customer support:

Subject: ${subject}
Body: ${body}

Please analyze and return a JSON response with:
1. sentiment: "positive", "negative", or "neutral"
2. priority: "urgent" or "normal" (urgent if contains keywords like immediately, critical, cannot access, urgent, emergency, asap)
3. category: brief category like "technical", "billing", "general inquiry", etc.
4. urgencyKeywords: array of urgent words found
5. extractedInfo: object with customer requirements, contact details, product mentioned, etc.

Return only valid JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an email analysis AI. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);
    
    return {
      sentiment: analysis.sentiment || 'neutral',
      priority: analysis.priority || 'normal',
      category: analysis.category || 'general',
      urgencyKeywords: analysis.urgencyKeywords || [],
      extractedInfo: analysis.extractedInfo || {}
    };
  } catch (error) {
    console.error('Error analyzing email:', error);
    return {
      sentiment: 'neutral',
      priority: 'normal',
      category: 'general',
      urgencyKeywords: [],
      extractedInfo: {}
    };
  }
}

async function generateAIResponse(subject: string, body: string, sentiment: string, extractedInfo: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  let systemPrompt = `You are a professional customer support assistant. Generate a helpful, empathetic response to this customer email.

Guidelines:
- Be professional and friendly
- Acknowledge the customer's concern
- Provide helpful information when possible
- Use a supportive tone
- Keep response concise but complete`;

  if (sentiment === 'negative') {
    systemPrompt += `
- The customer seems frustrated - acknowledge their frustration empathetically
- Use phrases like "I understand your concern" or "I apologize for the inconvenience"`;
  }

  const prompt = `Original Email Subject: ${subject}
Original Email Body: ${body}

Customer Context: ${JSON.stringify(extractedInfo)}

Please generate a professional response email.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Thank you for contacting us. We have received your message and will get back to you shortly.';
  }
}

async function updateAnalytics(userId: string, sentiment: string, priority: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's analytics
    const { data: existing } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const updates: any = {
      total_emails: (existing?.total_emails || 0) + 1,
      pending_emails: (existing?.pending_emails || 0) + 1
    };

    if (priority === 'urgent') {
      updates.urgent_emails = (existing?.urgent_emails || 0) + 1;
    }

    if (sentiment === 'positive') {
      updates.positive_sentiment = (existing?.positive_sentiment || 0) + 1;
    } else if (sentiment === 'negative') {
      updates.negative_sentiment = (existing?.negative_sentiment || 0) + 1;
    } else {
      updates.neutral_sentiment = (existing?.neutral_sentiment || 0) + 1;
    }

    if (existing) {
      await supabase
        .from('analytics')
        .update(updates)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('analytics')
        .insert({
          user_id: userId,
          date: today,
          ...updates
        });
    }
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
}