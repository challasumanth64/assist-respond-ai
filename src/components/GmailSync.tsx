import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mail, RefreshCw, Inbox } from 'lucide-react';

export default function GmailSync() {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const syncEmails = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      setLastSync(new Date());
      toast({
        title: 'Success',
        description: data.message || `Synced ${data.emailCount || 0} new emails`,
      });
      
      // Optionally refresh the page to show new emails
      window.location.reload();
    } catch (error) {
      console.error('Error syncing emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync emails from Gmail',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Connected to: challasumanth33@gmail.com</p>
          <p>This will automatically fetch unread emails from your Gmail inbox and process them through the AI system.</p>
        </div>

        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Last synced: {lastSync.toLocaleString()}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={syncEmails} disabled={loading} className="flex items-center gap-2">
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Inbox className="h-4 w-4" />
            )}
            {loading ? 'Syncing...' : 'Sync Gmail Emails'}
          </Button>
        </div>

        <div className="bg-muted p-3 rounded-md text-sm">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Connects to your Gmail via IMAP</li>
            <li>• Fetches unread emails automatically</li>
            <li>• Processes them through AI for sentiment and priority analysis</li>
            <li>• Generates smart responses for customer support</li>
            <li>• Marks emails as read after processing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}