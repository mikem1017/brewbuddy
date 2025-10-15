import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useStore';
import { settingsAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Label from '../components/ui/Label';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Save, Settings as SettingsIcon, Bell, Palette, Monitor, Zap, Shield, Database } from 'lucide-react';
import { getErrorMessage } from '../lib/utils';

const SettingsPage = () => {
  const { theme, setTheme, updateSettings } = useSettingsStore();
  const [formData, setFormData] = useState({
    units_temperature: 'celsius',
    units_volume: 'liters',
    theme: 'dark',
    graph_time_range: 'auto',
    live_plotting: true,
    show_tooltips: true,
    auto_refresh: true,
    sound_alerts: true,
    vibration_alerts: false,
    compact_mode: false,
    developer_mode: false,
    email_notifications: false,
    email_temp_high: true,
    email_temp_low: true,
    email_phase_complete: true,
    email_daily_summary: false,
    email_weekly_summary: false,
    email_batch_complete: true,
    email_maintenance_reminders: true,
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_from: '',
    data_retention_days: '90',
    log_level: 'info',
    backup_enabled: true,
    backup_frequency: 'daily',
    temperature_hysteresis: '0.5',
    control_loop_interval: '10',
    max_relay_cycles_per_day: '1000',
    sensor_calibration_offset: '0.0',
    emergency_shutdown_temp: '35.0',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.getAll();
      
      // Convert string boolean values to actual booleans
      const processedData = {};
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'string' && (data[key] === 'true' || data[key] === 'false')) {
          processedData[key] = data[key] === 'true';
        } else {
          processedData[key] = data[key];
        }
      });
      
      setFormData((prev) => ({ ...prev, ...processedData }));
      updateSettings({
        theme: data.theme || 'dark',
        unitsTemperature: data.units_temperature || 'celsius',
        unitsVolume: data.units_volume || 'liters',
        graphTimeRange: data.graph_time_range || 'auto',
        livePlotting: data.live_plotting === 'true' || data.live_plotting === true,
        showTooltips: data.show_tooltips === 'true' || data.show_tooltips === true,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Convert boolean values back to strings for API
      const apiData = {};
      Object.keys(formData).forEach(key => {
        if (typeof formData[key] === 'boolean') {
          apiData[key] = formData[key].toString();
        } else {
          apiData[key] = formData[key];
        }
      });
      
      await settingsAPI.updateBulk(apiData);
      
      // Update local store
      updateSettings({
        theme: formData.theme,
        unitsTemperature: formData.units_temperature,
        unitsVolume: formData.units_volume,
        graphTimeRange: formData.graph_time_range,
        livePlotting: formData.live_plotting,
        showTooltips: formData.show_tooltips,
      });
      
      // Apply theme
      setTheme(formData.theme);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your BrewBuddy preferences</p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
          <p className="text-green-500">Settings saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic application preferences and display options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  id="theme"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="high-contrast">High Contrast</option>
                  <option value="brew-master">Brew Master</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="units_temperature">Temperature Units</Label>
                <Select
                  id="units_temperature"
                  value={formData.units_temperature}
                  onChange={(e) => setFormData({ ...formData, units_temperature: e.target.value })}
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="units_volume">Volume Units</Label>
                <Select
                  id="units_volume"
                  value={formData.units_volume}
                  onChange={(e) => setFormData({ ...formData, units_volume: e.target.value })}
                >
                  <option value="liters">Liters (L)</option>
                  <option value="gallons">Gallons (gal)</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="graph_time_range">Default Graph Range</Label>
                <Select
                  id="graph_time_range"
                  value={formData.graph_time_range}
                  onChange={(e) => setFormData({ ...formData, graph_time_range: e.target.value })}
                >
                  <option value="auto">Auto</option>
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="full">Full Batch</option>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Display Options</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Live Plotting</Label>
                    <p className="text-xs text-muted-foreground">Update graphs in real-time</p>
                  </div>
                  <Toggle
                    checked={formData.live_plotting}
                    onChange={(checked) => setFormData({ ...formData, live_plotting: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Tooltips</Label>
                    <p className="text-xs text-muted-foreground">Display hover information</p>
                  </div>
                  <Toggle
                    checked={formData.show_tooltips}
                    onChange={(checked) => setFormData({ ...formData, show_tooltips: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Refresh</Label>
                    <p className="text-xs text-muted-foreground">Auto-refresh dashboard</p>
                  </div>
                  <Toggle
                    checked={formData.auto_refresh}
                    onChange={(checked) => setFormData({ ...formData, auto_refresh: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact Mode</Label>
                    <p className="text-xs text-muted-foreground">Reduce spacing</p>
                  </div>
                  <Toggle
                    checked={formData.compact_mode}
                    onChange={(checked) => setFormData({ ...formData, compact_mode: checked })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
            <CardDescription>Configure how you receive alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sound Alerts</Label>
                  <p className="text-xs text-muted-foreground">Play sounds for alerts</p>
                </div>
                <Toggle
                  checked={formData.sound_alerts}
                  onChange={(checked) => setFormData({ ...formData, sound_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Vibration Alerts</Label>
                  <p className="text-xs text-muted-foreground">Vibrate for alerts (mobile)</p>
                </div>
                <Toggle
                  checked={formData.vibration_alerts}
                  onChange={(checked) => setFormData({ ...formData, vibration_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Send alerts via email</p>
                </div>
                <Toggle
                  checked={formData.email_notifications}
                  onChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                />
              </div>
            </div>

            {formData.email_notifications && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Email Alert Types</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>High Temperature</Label>
                      <p className="text-xs text-muted-foreground">Temp too high alerts</p>
                    </div>
                    <Toggle
                      checked={formData.email_temp_high}
                      onChange={(checked) => setFormData({ ...formData, email_temp_high: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Low Temperature</Label>
                      <p className="text-xs text-muted-foreground">Temp too low alerts</p>
                    </div>
                    <Toggle
                      checked={formData.email_temp_low}
                      onChange={(checked) => setFormData({ ...formData, email_temp_low: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Phase Complete</Label>
                      <p className="text-xs text-muted-foreground">Fermentation phase done</p>
                    </div>
                    <Toggle
                      checked={formData.email_phase_complete}
                      onChange={(checked) => setFormData({ ...formData, email_phase_complete: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Batch Complete</Label>
                      <p className="text-xs text-muted-foreground">Batch finished</p>
                    </div>
                    <Toggle
                      checked={formData.email_batch_complete}
                      onChange={(checked) => setFormData({ ...formData, email_batch_complete: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Daily Summary</Label>
                      <p className="text-xs text-muted-foreground">Daily batch summary</p>
                    </div>
                    <Toggle
                      checked={formData.email_daily_summary}
                      onChange={(checked) => setFormData({ ...formData, email_daily_summary: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Summary</Label>
                      <p className="text-xs text-muted-foreground">Weekly batch summary</p>
                    </div>
                    <Toggle
                      checked={formData.email_weekly_summary}
                      onChange={(checked) => setFormData({ ...formData, email_weekly_summary: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Reminders</Label>
                      <p className="text-xs text-muted-foreground">Equipment maintenance</p>
                    </div>
                    <Toggle
                      checked={formData.email_maintenance_reminders}
                      onChange={(checked) => setFormData({ ...formData, email_maintenance_reminders: checked })}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              System Control
            </CardTitle>
            <CardDescription>Temperature control and hardware settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature_hysteresis">Temperature Hysteresis (°C)</Label>
                <Input
                  id="temperature_hysteresis"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={formData.temperature_hysteresis}
                  onChange={(e) => setFormData({ ...formData, temperature_hysteresis: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Temperature deadband for control</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="control_loop_interval">Control Loop Interval (seconds)</Label>
                <Input
                  id="control_loop_interval"
                  type="number"
                  min="5"
                  max="60"
                  value={formData.control_loop_interval}
                  onChange={(e) => setFormData({ ...formData, control_loop_interval: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">How often to check temperature</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_relay_cycles_per_day">Max Relay Cycles/Day</Label>
                <Input
                  id="max_relay_cycles_per_day"
                  type="number"
                  min="100"
                  max="10000"
                  value={formData.max_relay_cycles_per_day}
                  onChange={(e) => setFormData({ ...formData, max_relay_cycles_per_day: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Prevent relay wear</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sensor_calibration_offset">Sensor Offset (°C)</Label>
                <Input
                  id="sensor_calibration_offset"
                  type="number"
                  step="0.1"
                  min="-5.0"
                  max="5.0"
                  value={formData.sensor_calibration_offset}
                  onChange={(e) => setFormData({ ...formData, sensor_calibration_offset: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Calibrate sensor readings</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_shutdown_temp">Emergency Shutdown Temp (°C)</Label>
                <Input
                  id="emergency_shutdown_temp"
                  type="number"
                  step="0.5"
                  min="30.0"
                  max="50.0"
                  value={formData.emergency_shutdown_temp}
                  onChange={(e) => setFormData({ ...formData, emergency_shutdown_temp: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Safety shutdown temperature</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data & Backup
            </CardTitle>
            <CardDescription>Data retention, logging, and backup settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_retention_days">Data Retention (days)</Label>
                <Input
                  id="data_retention_days"
                  type="number"
                  min="7"
                  max="365"
                  value={formData.data_retention_days}
                  onChange={(e) => setFormData({ ...formData, data_retention_days: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Keep temperature logs for</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log_level">Log Level</Label>
                <Select
                  id="log_level"
                  value={formData.log_level}
                  onChange={(e) => setFormData({ ...formData, log_level: e.target.value })}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </Select>
                <p className="text-xs text-muted-foreground">System logging detail</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Backup</Label>
                  <p className="text-xs text-muted-foreground">Automatically backup data</p>
                </div>
                <Toggle
                  checked={formData.backup_enabled}
                  onChange={(checked) => setFormData({ ...formData, backup_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup_frequency">Backup Frequency</Label>
                <Select
                  id="backup_frequency"
                  value={formData.backup_frequency}
                  onChange={(e) => setFormData({ ...formData, backup_frequency: e.target.value })}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Select>
                <p className="text-xs text-muted-foreground">How often to backup</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Developer Mode</Label>
                  <p className="text-xs text-muted-foreground">Show debug info</p>
                </div>
                <Toggle
                  checked={formData.developer_mode}
                  onChange={(checked) => setFormData({ ...formData, developer_mode: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;

