import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2 } from 'lucide-react';

export default function EmailSimulator() {
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sampleEmails = [
    {
      sender: 'customer@example.com',
      subject: 'Urgent Support Request - Cannot Access Account',
      body: 'Hello,\n\nI am writing to you because I cannot access my account for the past 2 days. This is extremely urgent as I need to complete an important transaction. I have tried resetting my password multiple times but I keep getting an error. Please help me immediately!\n\nI am very frustrated with this issue.\n\nBest regards,\nJohn Smith\nPhone: (555) 123-4567'
    },
    {
      sender: 'business@company.com',
      subject: 'Help with Product Integration',
      body: 'Hi there,\n\nI hope you are doing well. We are trying to integrate your API with our system but we are facing some challenges with the authentication process. Could you please provide us with some guidance?\n\nWe would appreciate any documentation or examples you might have.\n\nThank you for your help!\n\nBest,\nSarah Johnson\nTechnical Lead'
    },
    {
      sender: 'user@email.com',
      subject: 'Billing Query - Duplicate Charge',
      body: 'Dear Support Team,\n\nI noticed a duplicate charge on my credit card statement for $99.99. The transaction appears twice for the same date. Please investigate this issue and provide a refund for the duplicate charge.\n\nTransaction ID: TXN123456789\nDate: January 15, 2024\n\nThank you for your assistance.\n\nMike Wilson'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderEmail || !subject || !body) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: 'Error',
          description: 'Please log in to simulate emails',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.functions.invoke('process-email', {
        body: {
          sender_email: senderEmail,
          subject,
          body,
          user_id: user.user.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email processed successfully!',
      });

      // Clear form
      setSenderEmail('');
      setSubject('');
      setBody('');
      
      // Refresh the page to show new email
      window.location.reload();
    } catch (error) {
      console.error('Error processing email:', error);
      toast({
        title: 'Error',
        description: 'Failed to process email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSampleEmail = (sample: typeof sampleEmails[0]) => {
    setSenderEmail(sample.sender);
    setSubject(sample.subject);
    setBody(sample.body);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Email Simulator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Simulate incoming support emails to test the AI processing system
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sample Emails */}
        <div>
          <Label className="text-base font-medium">Quick Load Sample Emails:</Label>
          <div className="grid gap-2 mt-2">
            {sampleEmails.map((sample, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto p-3"
                onClick={() => loadSampleEmail(sample)}
              >
                <div>
                  <div className="font-medium">{sample.subject}</div>
                  <div className="text-xs text-muted-foreground">{sample.sender}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sender">Sender Email</Label>
            <Input
              id="sender"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="customer@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Support Request - Issue Description"
              required
            />
          </div>

          <div>
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the customer's issue or request..."
              className="min-h-[150px]"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Email...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Process Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}