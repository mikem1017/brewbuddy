import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatchStore, useFermenterStore, useProfileStore, useSettingsStore } from '../store/useStore';
import { batchAPI, fermenterAPI, profileAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import { Plus, Play, Square, Eye, Copy, Package } from 'lucide-react';
import { formatDateTime, formatVolume, getStatusColor, getErrorMessage } from '../lib/utils';

const BatchesPage = () => {
  const navigate = useNavigate();
  const { batches, setBatches } = useBatchStore();
  const { fermenters } = useFermenterStore();
  const { profiles } = useProfileStore();
  const { unitsVolume } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    profile_id: '',
    fermenter_id: '',
    cost_ingredients: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadBatches();
    fermenterAPI.list().then(({ data }) => useFermenterStore.getState().setFermenters(data));
    profileAPI.list().then(({ data }) => useProfileStore.getState().setProfiles(data));
  }, [filterStatus]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? null : filterStatus;
      const { data } = await batchAPI.list(status);
      setBatches(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        ...formData,
        profile_id: parseInt(formData.profile_id),
        fermenter_id: parseInt(formData.fermenter_id),
        cost_ingredients: formData.cost_ingredients ? parseFloat(formData.cost_ingredients) : null,
      };

      await batchAPI.create(payload);
      resetForm();
      loadBatches();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleStart = async (batchId) => {
    try {
      await batchAPI.start(batchId);
      loadBatches();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleStop = async (batchId) => {
    if (!confirm('Are you sure you want to stop this batch?')) return;

    try {
      await batchAPI.stop(batchId);
      loadBatches();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClone = async (batchId) => {
    const fermenterId = prompt('Enter fermenter ID to clone to:');
    if (!fermenterId) return;

    try {
      await batchAPI.clone(batchId, parseInt(fermenterId));
      loadBatches();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      notes: '',
      profile_id: '',
      fermenter_id: '',
      cost_ingredients: '',
    });
    setShowForm(false);
    setError('');
  };

  const availableFermenters = fermenters.filter((f) =>
    !batches.some((b) => b.fermenter_id === f.id && b.status === 'active')
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batches</h1>
          <p className="text-muted-foreground">
            Manage your fermentation batches
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Batch
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Label>Filter:</Label>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-48">
          <option value="all">All Batches</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="complete">Complete</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Batch</CardTitle>
            <CardDescription>
              Start a new fermentation batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Batch Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer IPA Batch 1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile_id">Beer Profile *</Label>
                  <Select
                    id="profile_id"
                    value={formData.profile_id}
                    onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                    required
                  >
                    <option value="">Select a profile</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name} - {profile.beer_type}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fermenter_id">Fermenter *</Label>
                  <Select
                    id="fermenter_id"
                    value={formData.fermenter_id}
                    onChange={(e) => setFormData({ ...formData, fermenter_id: e.target.value })}
                    required
                  >
                    <option value="">Select a fermenter</option>
                    {availableFermenters.map((fermenter) => (
                      <option key={fermenter.id} value={fermenter.id}>
                        {fermenter.name} ({formatVolume(fermenter.size_liters, unitsVolume)})
                      </option>
                    ))}
                  </Select>
                  {availableFermenters.length === 0 && (
                    <p className="text-xs text-muted-foreground">No available fermenters</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_ingredients">Ingredient Cost ($)</Label>
                  <Input
                    id="cost_ingredients"
                    type="number"
                    step="0.01"
                    value={formData.cost_ingredients}
                    onChange={(e) => setFormData({ ...formData, cost_ingredients: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  Create Batch
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Batches List */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <Card key={batch.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{batch.name}</h3>
                    <Badge className={getStatusColor(batch.status)}>{batch.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Batch Number</p>
                      <p className="font-mono">{batch.batch_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{formatDateTime(batch.created_at)}</p>
                    </div>
                    {batch.start_time && (
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p>{formatDateTime(batch.start_time)}</p>
                      </div>
                    )}
                    {batch.end_time && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p>{formatDateTime(batch.end_time)}</p>
                      </div>
                    )}
                  </div>

                  {batch.notes && (
                    <p className="text-sm text-muted-foreground mt-3">{batch.notes}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/batches/${batch.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  {batch.status === 'scheduled' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStart(batch.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}

                  {batch.status === 'active' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStop(batch.id)}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  )}

                  {batch.status === 'complete' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(batch.id)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Clone
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {batches.length === 0 && !loading && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Batches Found</h3>
            <p className="text-muted-foreground mb-4">Create your first batch to get started</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Batch
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchesPage;

