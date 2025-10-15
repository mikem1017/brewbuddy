import { useState, useEffect } from 'react';
import { alertAPI, fermenterAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Label from '../components/ui/Label';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { Plus, Trash2, Bell, Check } from 'lucide-react';
import { formatDateTime, getErrorMessage } from '../lib/utils';

const AlertsPage = () => {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [fermenters, setFermenters] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [formData, setFormData] = useState({
    fermenter_id: '',
    rule_type: 'temp_high',
    threshold: '',
    enabled: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadRules();
    loadHistory();
    loadFermenters();
  }, []);

  const loadRules = async () => {
    try {
      const { data } = await alertAPI.listRules();
      setRules(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await alertAPI.listHistory(50);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const loadFermenters = async () => {
    try {
      const { data } = await fermenterAPI.list();
      setFermenters(data);
    } catch (err) {
      console.error('Failed to load fermenters:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await alertAPI.createRule({
        ...formData,
        fermenter_id: parseInt(formData.fermenter_id),
        threshold: formData.threshold ? parseFloat(formData.threshold) : null,
      });
      
      resetForm();
      loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      await alertAPI.updateRule(ruleId, { enabled: !enabled });
      loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      await alertAPI.deleteRule(ruleId);
      loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await alertAPI.acknowledgeAlert(alertId);
      loadHistory();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormData({
      fermenter_id: '',
      rule_type: 'temp_high',
      threshold: '',
      enabled: true,
    });
    setShowRuleForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Manage alert rules and notifications</p>
        </div>
        {!showRuleForm && (
          <Button onClick={() => setShowRuleForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Alert Rule
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Create Rule Form */}
      {showRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Alert Rule</CardTitle>
            <CardDescription>Set up a new alert condition</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fermenter_id">Fermenter *</Label>
                  <Select
                    id="fermenter_id"
                    value={formData.fermenter_id}
                    onChange={(e) => setFormData({ ...formData, fermenter_id: e.target.value })}
                    required
                  >
                    <option value="">Select a fermenter</option>
                    {fermenters.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule_type">Alert Type *</Label>
                  <Select
                    id="rule_type"
                    value={formData.rule_type}
                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                    required
                  >
                    <option value="temp_high">Temperature Too High</option>
                    <option value="temp_low">Temperature Too Low</option>
                    <option value="phase_complete">Phase Complete</option>
                  </Select>
                </div>

                {(formData.rule_type === 'temp_high' || formData.rule_type === 'temp_low') && (
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Threshold (°C)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="0.1"
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                      placeholder="e.g., 25"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="submit">Create Rule</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Active alert conditions</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No alert rules configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const fermenter = fermenters.find((f) => f.id === rule.fermenter_id);
                return (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {fermenter?.name || 'Unknown Fermenter'} - {rule.rule_type.replace('_', ' ')}
                          </p>
                          {rule.threshold && (
                            <p className="text-sm text-muted-foreground">
                              Threshold: {rule.threshold}°C
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      >
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Recent alerts (last 50)</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No alerts triggered yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.acknowledged ? 'bg-secondary/50' : 'bg-destructive/10 border border-destructive'
                  }`}
                >
                  <div className="flex-1">
                    <p className={alert.acknowledged ? 'text-muted-foreground' : 'font-medium'}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(alert.triggered_at)}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPage;


