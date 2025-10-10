import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Edit,
  Save,
  X,
  DollarSign,
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface MultaType {
  id: string;
  type: 'leve' | 'media' | 'grave' | 'gravissima';
  name: string;
  description: string;
  acsm_value: number;
  icetran_value: number;
  fixed_value: number;
  total_price: number;
  active: boolean;
  service_id: string;
}

interface MultaTypesConfigProps {
  onUpdate?: () => void;
}

function MultaTypesConfig({ onUpdate }: MultaTypesConfigProps) {
  const [multaTypes, setMultaTypes] = useState<MultaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<MultaType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMultaTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/multa-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMultaTypes(data.data || []);
      } else {
        toast.error('Erro ao carregar tipos de multa');
      }
    } catch (error) {
      console.error('Erro ao buscar tipos de multa:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMultaTypes();
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'leve':
        return 'bg-green-100 text-green-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'grave':
        return 'bg-orange-100 text-orange-800';
      case 'gravissima':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leve':
        return <CheckCircle className="h-4 w-4" />;
      case 'media':
      case 'grave':
        return <AlertTriangle className="h-4 w-4" />;
      case 'gravissima':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleEdit = (multaType: MultaType) => {
    setEditingType({ ...multaType });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingType) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/multa-types/${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          acsm_value: editingType.acsm_value,
          icetran_value: editingType.icetran_value,
          fixed_value: editingType.fixed_value,
          active: editingType.active
        })
      });

      if (response.ok) {
        toast.success('Configuração atualizada com sucesso');
        setIsDialogOpen(false);
        setEditingType(null);
        await fetchMultaTypes();
        onUpdate?.();
      } else {
        toast.error('Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof MultaType, value: number | boolean) => {
    if (!editingType) return;
    
    setEditingType({
      ...editingType,
      [field]: value
    });
  };

  const calculateTotal = () => {
    if (!editingType) return 0;
    return editingType.acsm_value + editingType.icetran_value + editingType.fixed_value;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Preços por Tipo de Multa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Preços por Tipo de Multa
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMultaTypes}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure os valores ACSM e Icetran para cada tipo de multa. O valor fixo de R$ 3,50 é adicionado automaticamente.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>ACSM</TableHead>
                <TableHead>Icetran</TableHead>
                <TableHead>Fixo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {multaTypes.map((multaType) => (
                <TableRow key={multaType.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(multaType.type)}
                      <div>
                        <Badge className={getTypeColor(multaType.type)}>
                          {multaType.name}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {multaType.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(multaType.acsm_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(multaType.icetran_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {formatCurrency(multaType.fixed_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-600">
                        {formatCurrency(multaType.total_price)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={multaType.active ? 'default' : 'secondary'}>
                      {multaType.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(multaType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Dialog de Edição */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Editar {editingType?.name}
                </DialogTitle>
              </DialogHeader>
              
              {editingType && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acsm_value">Valor ACSM</Label>
                      <Input
                        id="acsm_value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingType.acsm_value}
                        onChange={(e) => handleInputChange('acsm_value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="icetran_value">Valor Icetran</Label>
                      <Input
                        id="icetran_value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingType.icetran_value}
                        onChange={(e) => handleInputChange('icetran_value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fixed_value">Valor Fixo</Label>
                    <Input
                      id="fixed_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingType.fixed_value}
                      onChange={(e) => handleInputChange('fixed_value', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={editingType.active}
                      onCheckedChange={(checked) => handleInputChange('active', checked)}
                    />
                    <Label htmlFor="active">Tipo ativo</Label>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4" />
                      <span className="font-medium">Cálculo do Preço Total</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>ACSM:</span>
                        <span>{formatCurrency(editingType.acsm_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Icetran:</span>
                        <span>{formatCurrency(editingType.icetran_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fixo:</span>
                        <span>{formatCurrency(editingType.fixed_value)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold text-green-600">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default MultaTypesConfig;