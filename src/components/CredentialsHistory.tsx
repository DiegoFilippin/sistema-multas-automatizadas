import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, Clock, Key, Plus, Edit, Trash2 } from 'lucide-react';
import type { CredentialsAudit } from '@/services/subaccountService';

interface CredentialsHistoryProps {
  history: CredentialsAudit[];
  isLoading?: boolean;
  className?: string;
}

const actionIcons = {
  create: Plus,
  update: Edit,
  delete: Trash2
};

const actionColors = {
  create: 'success',
  update: 'warning',
  delete: 'destructive'
} as const;

const actionLabels = {
  create: 'Criado',
  update: 'Atualizado',
  delete: 'Deletado'
};

export function CredentialsHistory({ history, isLoading = false, className = '' }: CredentialsHistoryProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Credenciais
          </CardTitle>
          <CardDescription>
            Carregando histórico de alterações...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Credenciais
          </CardTitle>
          <CardDescription>
            Nenhuma alteração registrada nas credenciais desta subconta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Credenciais
        </CardTitle>
        <CardDescription>
          Registro de todas as alterações nas credenciais da subconta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.map((entry) => {
              const IconComponent = actionIcons[entry.action];
              const color = actionColors[entry.action];
              const label = actionLabels[entry.action];
              
              return (
                <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={color === 'success' ? 'default' : color === 'warning' ? 'secondary' : 'destructive'} className="flex items-center gap-1">
                        <IconComponent className="h-3 w-3" />
                        {label}
                      </Badge>
                      <span className="text-sm font-medium capitalize">
                        {entry.field_name.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.changed_at).toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    {entry.changed_by && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Por: {entry.user_email || entry.changed_by}</span>
                      </div>
                    )}
                    
                    {entry.old_value && (
                      <div className="flex items-center gap-2">
                        <Key className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 font-mono text-xs">
                          Valor anterior: {entry.old_value}
                        </span>
                      </div>
                    )}
                    
                    {entry.new_value && (
                      <div className="flex items-center gap-2">
                        <Key className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-mono text-xs">
                          Novo valor: {entry.new_value}
                        </span>
                      </div>
                    )}
                  </div>

                  {entry.ip_address && (
                    <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span>IP: {entry.ip_address}</span>
                        {entry.user_agent && (
                          <span className="truncate max-w-xs">Agent: {entry.user_agent}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}