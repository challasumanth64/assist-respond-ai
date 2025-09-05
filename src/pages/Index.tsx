import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Mail, BarChart3, Settings, TestTube } from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';
import EmailList from '@/components/EmailList';
import EmailSimulator from '@/components/EmailSimulator';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Communication Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  Intelligent email management and response system
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Email Simulator
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="emails">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Support Emails</h2>
                <p className="text-muted-foreground">
                  View and manage incoming support emails with AI-generated responses
                </p>
              </div>
              <EmailList />
            </div>
          </TabsContent>

          <TabsContent value="simulator">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Email Simulator</h2>
                <p className="text-muted-foreground">
                  Test the AI processing system by simulating incoming support emails
                </p>
              </div>
              <EmailSimulator />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Settings</h2>
                <p className="text-muted-foreground">
                  Configure your AI communication assistant
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Account Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">User ID:</span>
                      <span className="text-sm text-muted-foreground font-mono">{user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Account Created:</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">AI Configuration</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Model:</span>
                      <span className="text-sm text-muted-foreground">GPT-4o-mini</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Response Style:</span>
                      <span className="text-sm text-muted-foreground">Professional & Empathetic</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Auto-Processing:</span>
                      <span className="text-sm text-muted-foreground">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
