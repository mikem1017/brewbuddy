import { useState, useEffect } from 'react';
import { useDashboardStore, useSettingsStore } from '../store/useStore';
import { dashboardAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatTemp, formatDuration, getStatusColor, getControlStateColor, prepareChartData } from '../lib/utils';
import { Droplet, Thermometer, Clock, Activity } from 'lucide-react';

const DashboardPage = () => {
  const { batches, setBatches, setLoading } = useDashboardStore();
  const { unitsTemperature } = useSettingsStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
    
    // Set up WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/dashboard/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        // Update batches with new data
        setBatches(data.data.map((update) => {
          const existing = batches.find((b) => b.batch.id === update.batch_id);
          if (existing) {
            return {
              ...existing,
              current_temp: update.current_temp,
              target_temp: update.target_temp,
              control_state: update.control_state,
              current_phase: update.current_phase,
              phase_progress: update.phase_progress,
            };
          }
          return existing;
        }).filter(Boolean));
      }
    };

    // Poll every 30 seconds as backup
    const interval = setInterval(loadDashboard, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await dashboardAPI.get();
      setBatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor all active fermentations</p>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <Droplet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Batches</h3>
            <p className="text-muted-foreground">Start a batch to see it here</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Monitor all active fermentations</p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
        {batches.map((batchStatus) => {
          const { batch, current_temp, target_temp, control_state, current_phase, phase_progress, elapsed_hours, recent_logs } = batchStatus;
          const chartData = prepareChartData(recent_logs || [], unitsTemperature);

          return (
            <Card key={batch.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{batch.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{batch.batch_number}</p>
                    <p className="text-sm text-muted-foreground">{batch.fermenter.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                    {control_state && (
                      <Badge className={getControlStateColor(control_state)}>
                        {control_state}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Current stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Thermometer className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Temp</p>
                      <p className="text-lg font-semibold">
                        {current_temp != null ? formatTemp(current_temp, unitsTemperature) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Target Temp</p>
                      <p className="text-lg font-semibold">
                        {target_temp != null ? formatTemp(target_temp, unitsTemperature) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phase progress */}
                {current_phase != null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Phase {current_phase + 1}</p>
                      <p className="text-sm text-muted-foreground">{phase_progress?.toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${phase_progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Elapsed time */}
                {elapsed_hours != null && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Elapsed: {formatDuration(elapsed_hours)}</span>
                  </div>
                )}

                {/* Temperature chart */}
                {chartData.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="timestamp" 
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                          className="text-xs"
                        />
                        <YAxis 
                          domain={['auto', 'auto']}
                          className="text-xs"
                        />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value) => [`${value.toFixed(1)}°`, '']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="hsl(var(--primary))" 
                          name="Actual"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          stroke="hsl(var(--muted-foreground))" 
                          name="Target"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;

