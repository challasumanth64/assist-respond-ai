import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Clock, User, Tag, Zap } from 'lucide-react';

interface Email {
  id: string;
  sender_email: string;
  subject: string;
  body: string;
  received_at: string;
  sentiment: string | null;
  priority: string;
  category: string | null;
  urgency_keywords: string[] | null;
  extracted_info: any;
  processed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Response {
  id: string;
  email_id: string;
  generated_response: string;
  edited_response?: string | null;
  sent: boolean;
  sent_at?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
    fetchResponses();
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('priority', { ascending: false })
        .order('received_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*');

      if (error) throw error;
      
      const responseMap: Record<string, Response> = {};
      data?.forEach(response => {
        responseMap[response.email_id] = response;
      });
      setResponses(responseMap);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const sendResponse = async (responseId: string, emailId: string, finalResponse: string, recipientEmail: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-response', {
        body: {
          response_id: responseId,
          final_response: finalResponse,
          recipient_email: recipientEmail
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Response sent successfully',
      });

      // Refresh data
      await fetchEmails();
      await fetchResponses();
      setEditingResponse(null);
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response',
        variant: 'destructive',
      });
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'urgent' 
      ? 'bg-orange-100 text-orange-800 border-orange-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {emails.map((email) => {
        const response = responses[email.id];
        const isEditing = editingResponse === email.id;

        return (
          <Card key={email.id} className={`border-l-4 ${email.priority === 'urgent' ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5" />
                  {email.subject}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className={getSentimentColor(email.sentiment)}>
                    {email.sentiment || 'neutral'}
                  </Badge>
                  <Badge className={getPriorityColor(email.priority)}>
                    {email.priority === 'urgent' && <Zap className="h-3 w-3 mr-1" />}
                    {email.priority}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {email.sender_email}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(email.received_at).toLocaleString()}
                </div>
                {email.category && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    {email.category}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Email Content:</h4>
                <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {email.body}
                </p>
              </div>

              {email.urgency_keywords && email.urgency_keywords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Urgency Keywords:</h4>
                  <div className="flex flex-wrap gap-1">
                    {email.urgency_keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {email.extracted_info && Object.keys(email.extracted_info).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Extracted Information:</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(email.extracted_info, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {response && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">AI Generated Response:</h4>
                  
                  {isEditing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="min-h-[120px]"
                        placeholder="Edit the response..."
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => sendResponse(response.id, email.id, editedText, email.sender_email)}
                        >
                          Send Response
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingResponse(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                        <p className="text-sm whitespace-pre-wrap">
                          {response.edited_response || response.generated_response}
                        </p>
                      </div>
                      
                      {response.sent ? (
                        <Badge className="bg-green-100 text-green-800">
                          ✓ Sent on {response.sent_at ? new Date(response.sent_at).toLocaleString() : 'Unknown'}
                        </Badge>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingResponse(email.id);
                              setEditedText(response.edited_response || response.generated_response);
                            }}
                          >
                            Edit & Send
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => sendResponse(response.id, email.id, response.generated_response, email.sender_email)}
                          >
                            Send As-Is
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {emails.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No emails found</h3>
            <p className="text-muted-foreground">
              Support emails will appear here when they're processed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}