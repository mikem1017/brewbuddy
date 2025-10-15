import { useState, useEffect } from 'react';
import { useFermenterStore, useSettingsStore } from '../store/useStore';
import { fermenterAPI, systemAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { Plus, Trash2, Edit2, Droplet, Power, Save, X } from 'lucide-react';
import { formatVolume, getStatusColor, getErrorMessage } from '../lib/utils';

const FermentersPage = () => {
  const { fermenters, setFermenters, addFermenter, updateFermenter, removeFermenter } = useFermenterStore();
  const { unitsVolume } = useSettingsStore();
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    size_liters: '',
    heater_gpio: '',
    chiller_gpio: '',
    sensor_id: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadFermenters();
    loadSensors();
  }, []);

  const loadFermenters = async () => {
    try {
      setLoading(true);
      const { data } = await fermenterAPI.list();
      setFermenters(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadSensors = async () => {
    try {
      const { data } = await systemAPI.sensors();
      setSensors(data);
    } catch (err) {
      console.error('Failed to load sensors:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        const { data } = await fermenterAPI.update(editingId, formData);
        updateFermenter(editingId, data);
      } else {
        const { data } = await fermenterAPI.create(formData);
        addFermenter(data);
      }
      
      resetForm();
      loadFermenters();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (fermenter) => {
    setFormData({
      name: fermenter.name,
      size_liters: fermenter.size_liters,
      heater_gpio: fermenter.heater_gpio,
      chiller_gpio: fermenter.chiller_gpio,
      sensor_id: fermenter.sensor_id,
    });
    setEditingId(fermenter.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fermenter?')) return;

    try {
      await fermenterAPI.delete(id);
      removeFermenter(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      size_liters: '',
      heater_gpio: '',
      chiller_gpio: '',
      sensor_id: '',
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const canAddMore = fermenters.length < 4;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fermenters</h1>
          <p className="text-muted-foreground">
            Manage your fermentation vessels ({fermenters.length}/4)
          </p>
        </div>
        {canAddMore && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fermenter
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Fermenter' : 'Add New Fermenter'}</CardTitle>
            <CardDescription>
              Configure a new fermenter with its hardware settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Fermenter Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Fermenter 1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size_liters">Size (Liters) *</Label>
                  <Input
                    id="size_liters"
                    type="number"
                    step="0.1"
                    value={formData.size_liters}
                    onChange={(e) => setFormData({ ...formData, size_liters: e.target.value })}
                    placeholder="e.g., 20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heater_gpio">Heater GPIO Pin *</Label>
                  <Input
                    id="heater_gpio"
                    type="number"
                    value={formData.heater_gpio}
                    onChange={(e) => setFormData({ ...formData, heater_gpio: e.target.value })}
                    placeholder="e.g., 17"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chiller_gpio">Chiller GPIO Pin *</Label>
                  <Input
                    id="chiller_gpio"
                    type="number"
                    value={formData.chiller_gpio}
                    onChange={(e) => setFormData({ ...formData, chiller_gpio: e.target.value })}
                    placeholder="e.g., 27"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="sensor_id">Temperature Sensor *</Label>
                  <Select
                    id="sensor_id"
                    value={formData.sensor_id}
                    onChange={(e) => setFormData({ ...formData, sensor_id: e.target.value })}
                    required
                  >
                    <option value="">Select a sensor</option>
                    {sensors.map((sensor) => (
                      <option key={sensor.id} value={sensor.id}>
                        {sensor.id} {sensor.temperature != null ? `(${sensor.temperature.toFixed(1)}°C)` : '(disconnected)'}
                      </option>
                    ))}
                  </Select>
                  {sensors.length === 0 && (
                    <p className="text-xs text-muted-foreground">No sensors detected</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'} Fermenter
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Fermenters List */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
        {fermenters.map((fermenter) => (
          <Card key={fermenter.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Droplet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{fermenter.name}</CardTitle>
                    <CardDescription>
                      {formatVolume(fermenter.size_liters, unitsVolume)}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(fermenter.status)}>
                  {fermenter.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Heater GPIO</p>
                  <p className="font-medium">{fermenter.heater_gpio}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Chiller GPIO</p>
                  <p className="font-medium">{fermenter.chiller_gpio}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Sensor ID</p>
                  <p className="font-mono text-xs">{fermenter.sensor_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Relay Cycles</p>
                  <p className="font-medium">{fermenter.relay_cycle_count.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(fermenter)}
                  disabled={fermenter.status === 'in_use'}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(fermenter.id)}
                  disabled={fermenter.status === 'in_use'}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fermenters.length === 0 && !loading && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <Droplet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Fermenters Yet</h3>
            <p className="text-muted-foreground mb-4">Add your first fermenter to get started</p>
            {canAddMore && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fermenter
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FermentersPage;

