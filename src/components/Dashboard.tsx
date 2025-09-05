import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle, AlertCircle, TrendingUp, Smile, Frown, Meh } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Analytics {
  date: string;
  total_emails: number;
  urgent_emails: number;
  resolved_emails: number;
  pending_emails: number;
  positive_sentiment: number;
  negative_sentiment: number;
  neutral_sentiment: number;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [todayStats, setTodayStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch last 7 days of analytics
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;

      setAnalytics(data || []);
      
      // Set today's stats (most recent entry)
      if (data && data.length > 0) {
        setTodayStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = analytics.slice().reverse().map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    emails: item.total_emails,
    resolved: item.resolved_emails,
    pending: item.pending_emails
  }));

  const sentimentData = todayStats ? [
    { name: 'Positive', value: todayStats.positive_sentiment, color: '#22c55e' },
    { name: 'Negative', value: todayStats.negative_sentiment, color: '#ef4444' },
    { name: 'Neutral', value: todayStats.neutral_sentiment, color: '#6b7280' }
  ] : [];

  const totalSentiment = sentimentData.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails (24h)</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {todayStats?.total_emails || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              emails received today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Emails</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {todayStats?.urgent_emails || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todayStats?.resolved_emails || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              emails responded to
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {todayStats?.pending_emails || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Email Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="emails" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Total Emails"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={2}
                    name="Resolved"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pending" 
                    stroke="hsl(221 83% 53%)" 
                    strokeWidth={2}
                    name="Pending"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {totalSentiment > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">Positive</div>
                      <div className="text-muted-foreground">
                        {todayStats?.positive_sentiment || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Frown className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="font-medium">Negative</div>
                      <div className="text-muted-foreground">
                        {todayStats?.negative_sentiment || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Meh className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Neutral</div>
                      <div className="text-muted-foreground">
                        {todayStats?.neutral_sentiment || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No sentiment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Urgent</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {todayStats?.urgent_emails || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Normal</span>
                <Badge variant="secondary">
                  {(todayStats?.total_emails || 0) - (todayStats?.urgent_emails || 0)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {todayStats?.total_emails 
                  ? Math.round((todayStats.resolved_emails / todayStats.total_emails) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                of emails resolved today
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Emails</span>
                <span className="font-medium">
                  {analytics.reduce((sum, item) => sum + item.total_emails, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Resolved</span>
                <span className="font-medium text-green-600">
                  {analytics.reduce((sum, item) => sum + item.resolved_emails, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}