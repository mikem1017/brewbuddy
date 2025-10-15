import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchAPI, extraAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download } from 'lucide-react';
import { formatTemp, formatDateTime, getStatusColor, prepareChartData, getErrorMessage } from '../lib/utils';
import { useSettingsStore } from '../store/useStore';

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unitsTemperature } = useSettingsStore();
  const [batch, setBatch] = useState(null);
  const [logs, setLogs] = useState([]);
  const [timeRange, setTimeRange] = useState('24'); // hours
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBatch();
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [id, timeRange]);

  const loadBatch = async () => {
    try {
      const { data } = await batchAPI.get(id);
      setBatch(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const hours = timeRange === 'all' ? null : parseInt(timeRange);
      const { data } = await batchAPI.getLogs(id, { hours });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await extraAPI.exportBatchCSV(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `batch_${batch.batch_number}_logs.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error || !batch) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-destructive">Error: {error || 'Batch not found'}</p>
        </div>
      </div>
    );
  }

  const chartData = prepareChartData(logs, unitsTemperature);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/batches')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{batch.name}</h1>
            <p className="text-muted-foreground">{batch.batch_number}</p>
          </div>
          <Badge className={getStatusColor(batch.status)}>{batch.status}</Badge>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Batch Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Profile</p>
              <p className="font-medium">{batch.profile.name}</p>
              <p className="text-sm">{batch.profile.beer_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fermenter</p>
              <p className="font-medium">{batch.fermenter.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDateTime(batch.created_at)}</p>
            </div>
            {batch.start_time && (
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">{formatDateTime(batch.start_time)}</p>
              </div>
            )}
            {batch.end_time && (
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDateTime(batch.end_time)}</p>
              </div>
            )}
            {batch.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{batch.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temperature Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {batch.profile.phases.map((phase, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                  <span className="text-sm font-medium text-foreground">Phase {index + 1}</span>
                  <div className="text-right text-sm">
                    <p className="text-foreground font-medium">{formatTemp(phase.target_temp_celsius, unitsTemperature)}</p>
                    <p className="text-muted-foreground">{phase.duration_hours}h</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Temperature History</CardTitle>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="1">Last Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last Week</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => new Date(value).toLocaleString()}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value, name) => [
                      `${value.toFixed(1)}°${unitsTemperature === 'celsius' ? 'C' : 'F'}`,
                      name === 'actual' ? 'Actual' : 'Target'
                    ]}
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
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No temperature data available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchDetailPage;

