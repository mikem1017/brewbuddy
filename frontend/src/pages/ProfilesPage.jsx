import { useState, useEffect } from 'react';
import { useProfileStore, useSettingsStore } from '../store/useStore';
import { profileAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Textarea from '../components/ui/Textarea';
import { Plus, Trash2, Edit2, FileText, X, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTemp, formatDuration, getErrorMessage } from '../lib/utils';

const ProfilesPage = () => {
  const { profiles, setProfiles, addProfile, updateProfile, removeProfile } = useProfileStore();
  const { unitsTemperature } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    beer_type: '',
    phases: [],
  });
  const [newPhase, setNewPhase] = useState({
    duration_hours: '',
    target_temp_celsius: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data } = await profileAPI.list();
      setProfiles(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.phases.length === 0) {
      setError('Please add at least one phase');
      return;
    }

    try {
      if (editingId) {
        const { data } = await profileAPI.update(editingId, {
          name: formData.name,
          description: formData.description,
          beer_type: formData.beer_type,
        });
        updateProfile(editingId, data);
      } else {
        const { data } = await profileAPI.create(formData);
        addProfile(data);
      }
      
      resetForm();
      loadProfiles();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAddPhase = () => {
    if (!newPhase.duration_hours || !newPhase.target_temp_celsius) {
      setError('Please fill in phase duration and temperature');
      return;
    }

    setFormData({
      ...formData,
      phases: [
        ...formData.phases,
        {
          sequence_order: formData.phases.length,
          duration_hours: parseFloat(newPhase.duration_hours),
          target_temp_celsius: parseFloat(newPhase.target_temp_celsius),
        },
      ],
    });

    setNewPhase({ duration_hours: '', target_temp_celsius: '' });
    setError('');
  };

  const handleRemovePhase = (index) => {
    const newPhases = formData.phases.filter((_, i) => i !== index);
    // Re-sequence
    newPhases.forEach((phase, i) => {
      phase.sequence_order = i;
    });
    setFormData({ ...formData, phases: newPhases });
  };

  const handleEdit = (profile) => {
    setFormData({
      name: profile.name,
      description: profile.description || '',
      beer_type: profile.beer_type || '',
      phases: profile.phases.map((p) => ({ ...p })),
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      await profileAPI.delete(id);
      removeProfile(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      beer_type: '',
      phases: [],
    });
    setNewPhase({ duration_hours: '', target_temp_celsius: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const generateChartData = (phases) => {
    const data = [];
    let cumulativeHours = 0;

    phases.forEach((phase, index) => {
      // Start point of phase
      data.push({
        hour: cumulativeHours,
        temp: phase.target_temp_celsius,
        phase: index + 1,
      });

      // End point of phase
      cumulativeHours += phase.duration_hours;
      data.push({
        hour: cumulativeHours,
        temp: phase.target_temp_celsius,
        phase: index + 1,
      });
    });

    return data;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Beer Profiles</h1>
          <p className="text-muted-foreground">
            Create temperature profiles for your fermentations
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Profile
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
            <CardTitle>{editingId ? 'Edit Profile' : 'Create New Profile'}</CardTitle>
            <CardDescription>
              Define a temperature profile with multiple phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., German Lager"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beer_type">Beer Type</Label>
                  <Input
                    id="beer_type"
                    value={formData.beer_type}
                    onChange={(e) => setFormData({ ...formData, beer_type: e.target.value })}
                    placeholder="e.g., Lager, IPA, Stout"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this fermentation profile..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Phases */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Temperature Phases</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.phases.length} phase(s)
                  </span>
                </div>

                {/* Phase list */}
                {formData.phases.length > 0 && (
                  <div className="space-y-2">
                    {formData.phases.map((phase, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            Phase {index + 1}: {formatTemp(phase.target_temp_celsius, unitsTemperature)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {formatDuration(phase.duration_hours)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePhase(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add phase form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      step="0.1"
                      value={newPhase.duration_hours}
                      onChange={(e) => setNewPhase({ ...newPhase, duration_hours: e.target.value })}
                      placeholder="24"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temp">Temperature (°C)</Label>
                    <Input
                      id="temp"
                      type="number"
                      step="0.1"
                      value={newPhase.target_temp_celsius}
                      onChange={(e) => setNewPhase({ ...newPhase, target_temp_celsius: e.target.value })}
                      placeholder="20"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddPhase}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Phase
                    </Button>
                  </div>
                </div>

                {/* Temperature profile graph */}
                {formData.phases.length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Temperature Profile</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={generateChartData(formData.phases)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="hour"
                            label={{ value: 'Hours', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis
                            label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip
                            formatter={(value, name) =>
                              name === 'temp' ? [`${value}°C`, 'Temperature'] : value
                            }
                            labelFormatter={(value) => `Hour ${value}`}
                          />
                          <Line
                            type="stepAfter"
                            dataKey="temp"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'} Profile
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

      {/* Profiles List */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
        {profiles.map((profile) => {
          const totalDuration = profile.phases.reduce((sum, p) => sum + p.duration_hours, 0);
          const chartData = generateChartData(profile.phases);

          return (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      {profile.beer_type && (
                        <CardDescription>{profile.beer_type}</CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {profile.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phases</span>
                    <span className="font-medium">{profile.phases.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Duration</span>
                    <span className="font-medium">{formatDuration(totalDuration)}</span>
                  </div>
                </div>

                {/* Mini chart */}
                {chartData.length > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="hour" hide />
                        <YAxis hide />
                        <Line
                          type="stepAfter"
                          dataKey="temp"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="flex space-x-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(profile.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {profiles.length === 0 && !loading && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Profiles Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first beer profile</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilesPage;

