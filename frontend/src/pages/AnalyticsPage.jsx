import { useState, useEffect } from 'react';
import { batchAPI, fermenterAPI, systemAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, DollarSign, Activity } from 'lucide-react';

const AnalyticsPage = () => {
  const [batches, setBatches] = useState([]);
  const [fermenters, setFermenters] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [batchData, fermenterData, healthData] = await Promise.all([
        batchAPI.list(),
        fermenterAPI.list(),
        systemAPI.health(),
      ]);
      setBatches(batchData.data);
      setFermenters(fermenterData.data);
      setSystemHealth(healthData.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  // Calculate stats
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.status === 'active').length;
  const completedBatches = batches.filter((b) => b.status === 'complete').length;
  const totalCost = batches.reduce((sum, b) => sum + (b.cost_ingredients || 0), 0);

  // Status distribution
  const statusData = [
    { name: 'Active', value: activeBatches, color: 'hsl(var(--primary))' },
    { name: 'Scheduled', value: batches.filter((b) => b.status === 'scheduled').length, color: 'hsl(210, 100%, 60%)' },
    { name: 'Complete', value: completedBatches, color: 'hsl(120, 60%, 50%)' },
    { name: 'Cancelled', value: batches.filter((b) => b.status === 'cancelled').length, color: 'hsl(0, 60%, 50%)' },
  ].filter((item) => item.value > 0);

  // Fermenter usage
  const fermenterUsage = fermenters.map((f) => ({
    name: f.name,
    batches: batches.filter((b) => b.fermenter_id === f.id).length,
  }));

  // Monthly batches (last 6 months)
  const monthlyBatches = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = batches.filter((b) => {
      const batchDate = new Date(b.created_at);
      const batchKey = `${batchDate.getFullYear()}-${String(batchDate.getMonth() + 1).padStart(2, '0')}`;
      return batchKey === monthKey;
    }).length;
    monthlyBatches.push({
      month: date.toLocaleString('default', { month: 'short' }),
      batches: count,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">System insights and statistics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Batches</p>
                <p className="text-2xl font-bold">{totalBatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Batches</p>
                <p className="text-2xl font-bold">{activeBatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedBatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
        {/* Batch Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Status Distribution</CardTitle>
            <CardDescription>Current batch statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fermenter Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Fermenter Usage</CardTitle>
            <CardDescription>Total batches per fermenter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fermenterUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="batches" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Batches */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Batch Trend</CardTitle>
            <CardDescription>Batches created per month (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBatches}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="batches" fill="hsl(var(--primary))" name="Batches Created" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Raspberry Pi status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Uptime</p>
                <p className="font-medium">
                  {(systemHealth.uptime_seconds / 3600).toFixed(1)}h
                </p>
              </div>
              {systemHealth.cpu_temp && (
                <div>
                  <p className="text-muted-foreground">CPU Temp</p>
                  <p className="font-medium">{systemHealth.cpu_temp.toFixed(1)}°C</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Disk Usage</p>
                <p className="font-medium">{systemHealth.disk_usage_percent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">DB Size</p>
                <p className="font-medium">{systemHealth.database_size_mb.toFixed(1)} MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsPage;

