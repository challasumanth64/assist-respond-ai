-- Create emails table to store incoming emails
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  priority TEXT CHECK (priority IN ('urgent', 'normal')) NOT NULL DEFAULT 'normal',
  category TEXT,
  urgency_keywords TEXT[],
  extracted_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create responses table to store AI-generated responses
CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  generated_response TEXT NOT NULL,
  edited_response TEXT,
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics table for dashboard metrics
CREATE TABLE public.analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_emails INTEGER NOT NULL DEFAULT 0,
  urgent_emails INTEGER NOT NULL DEFAULT 0,
  resolved_emails INTEGER NOT NULL DEFAULT 0,
  pending_emails INTEGER NOT NULL DEFAULT 0,
  positive_sentiment INTEGER NOT NULL DEFAULT 0,
  negative_sentiment INTEGER NOT NULL DEFAULT 0,
  neutral_sentiment INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create knowledge_base table for RAG functionality
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for emails table
CREATE POLICY "Users can view their own emails" 
ON public.emails 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emails" 
ON public.emails 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" 
ON public.emails 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for responses table
CREATE POLICY "Users can view their own responses" 
ON public.responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses" 
ON public.responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses" 
ON public.responses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for analytics table
CREATE POLICY "Users can view their own analytics" 
ON public.analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics" 
ON public.analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" 
ON public.analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for knowledge_base table
CREATE POLICY "Users can view their own knowledge_base" 
ON public.knowledge_base 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge_base" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge_base" 
ON public.knowledge_base 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge_base" 
ON public.knowledge_base 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON public.analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_emails_user_id ON public.emails(user_id);
CREATE INDEX idx_emails_priority ON public.emails(priority);
CREATE INDEX idx_emails_sentiment ON public.emails(sentiment);
CREATE INDEX idx_emails_processed ON public.emails(processed);
CREATE INDEX idx_emails_received_at ON public.emails(received_at);

CREATE INDEX idx_responses_email_id ON public.responses(email_id);
CREATE INDEX idx_responses_user_id ON public.responses(user_id);

CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_date ON public.analytics(date);

CREATE INDEX idx_knowledge_base_user_id ON public.knowledge_base(user_id);