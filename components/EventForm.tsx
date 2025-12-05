import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EventType, EventStatus } from '../types';
import { EVENT_COLORS, EVENT_TYPE_LABELS, API_BASE_URL } from '../constants';
import { Input } from './Input';
import { Button } from './Button';
import { Calendar, Clock, AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const schema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  eventType: z.nativeEnum(EventType),
  isAllDay: z.boolean(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de término é obrigatória"),
  status: z.nativeEnum(EventStatus).optional(),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: "A data de término deve ser posterior à data de início",
  path: ["endDate"],
});

type EventFormData = z.infer<typeof schema>;

interface EventFormProps {
  initialData?: any;
  eventId?: string;
  isSupervisor?: boolean;
}

const createOrUpdateEvent = async ({ data, eventId }: { data: EventFormData; eventId?: string }) => {
  const token = localStorage.getItem('token');
  const payload = {
    ...data,
    startDate: new Date(data.startDate).toISOString(),
    endDate: new Date(data.endDate).toISOString(),
  };

  const url = eventId 
    ? `${API_BASE_URL}/events/${eventId}` 
    : `${API_BASE_URL}/events`;
  
  const method = eventId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Falha ao salvar evento');
  }

  return res.json();
};

export const EventForm: React.FC<EventFormProps> = ({ initialData, eventId, isSupervisor = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<EventFormData | null>(null);

  const hasSupervisorRights = isSupervisor || user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN;
  
  const { 
    register, 
    handleSubmit, 
    watch, 
    reset,
    setValue,
    formState: { errors } 
  } = useForm<EventFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventType: EventType.REUNIAO,
      isAllDay: false,
      status: hasSupervisorRights ? EventStatus.APPROVED : undefined,
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description || '',
        eventType: initialData.eventType,
        isAllDay: initialData.isAllDay,
        startDate: initialData.isAllDay 
          ? new Date(initialData.startDate).toISOString().split('T')[0] 
          : new Date(initialData.startDate).toISOString().slice(0, 16),
        endDate: initialData.isAllDay 
          ? new Date(initialData.endDate).toISOString().split('T')[0] 
          : new Date(initialData.endDate).toISOString().slice(0, 16),
        status: initialData.status,
      });
    }
  }, [initialData, reset]);

  const mutation = useMutation({
    mutationFn: (data: EventFormData) => createOrUpdateEvent({ data, eventId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      
      if(data.warning) {
        alert(data.warning); // Simples alerta para warnings do backend
      }

      if (hasSupervisorRights) {
        navigate('/supervisor');
      } else {
        navigate('/my-events');
      }
    },
  });

  const isAllDay = watch('isAllDay');
  const selectedType = watch('eventType');
  const currentStatus = watch('status');
  const currentColor = EVENT_COLORS[selectedType as EventType] || EVENT_COLORS[EventType.OUTROS];

  const onSubmit = (data: EventFormData) => {
    if (hasSupervisorRights && data.status === EventStatus.APPROVED) {
      setPendingData(data);
      setShowConfirmModal(true);
    } else {
      mutation.mutate(data);
    }
  };

  const handleConfirmAutoApprove = () => {
    if (pendingData) {
      mutation.mutate(pendingData);
      setShowConfirmModal(false);
    }
  };

  const handleDraftSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    setValue('status', EventStatus.PENDING);
    handleSubmit((data) => {
      mutation.mutate({ ...data, status: EventStatus.PENDING });
    })();
  };

  const handleAutoApproveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('status', e.target.checked ? EventStatus.APPROVED : EventStatus.PENDING);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl mx-auto">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {eventId ? 'Editar Evento' : 'Criar Novo Evento'}
            </h2>
            <p className="text-sm text-slate-500">
              {eventId ? 'Atualizar detalhes do evento' : 'Agendar uma nova atividade ou solicitação'}
            </p>
          </div>
          <div className="flex flex-col items-center">
             <div 
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-colors duration-300" 
              style={{ backgroundColor: currentColor }}
              title={`Prévia da Cor: ${EVENT_TYPE_LABELS[selectedType]}`}
            />
            <span className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Prévia</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {mutation.isError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {mutation.error.message}
            </div>
          )}

          <Input
            label="Título do Evento"
            placeholder="ex: Reunião de Equipe, Visita ao Cliente"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Evento
              </label>
              <div className="relative">
                <select
                  {...register('eventType')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                >
                  {Object.values(EventType).map((type) => (
                    <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              {errors.eventType && (
                <p className="mt-1 text-sm text-red-600">{errors.eventType.message}</p>
              )}
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  {...register('isAllDay')} 
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-slate-700 font-medium">Dia Inteiro</span>
              </label>
            </div>
          </div>

          {hasSupervisorRights && (
            <div className={`p-4 rounded-lg border flex items-center transition-colors ${currentStatus === EventStatus.APPROVED ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
              <ShieldCheck className={`w-5 h-5 mr-3 ${currentStatus === EventStatus.APPROVED ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div className="flex-1">
                 <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentStatus === EventStatus.APPROVED}
                    onChange={handleAutoApproveChange}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className={`ml-2 text-sm font-medium ${currentStatus === EventStatus.APPROVED ? 'text-indigo-900' : 'text-slate-600'}`}>
                    Aprovar Automaticamente
                  </span>
                </label>
                <p className={`text-xs mt-1 ml-6 ${currentStatus === EventStatus.APPROVED ? 'text-indigo-700' : 'text-slate-500'}`}>
                  Se marcado, o evento será publicado no Google Agenda imediatamente.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Início {isAllDay ? '' : '& Hora'}
              </label>
              <div className="relative">
                <input
                  type={isAllDay ? 'date' : 'datetime-local'}
                  className={`w-full px-3 py-2 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.startDate ? 'border-red-500' : 'border-slate-300'}`}
                  {...register('startDate')}
                />
                <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                  {isAllDay ? <Calendar size={18} /> : <Clock size={18} />}
                </div>
              </div>
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fim {isAllDay ? '' : '& Hora'}
              </label>
              <div className="relative">
                <input
                  type={isAllDay ? 'date' : 'datetime-local'}
                  className={`w-full px-3 py-2 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.endDate ? 'border-red-500' : 'border-slate-300'}`}
                  {...register('endDate')}
                />
                <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                  {isAllDay ? <Calendar size={18} /> : <Clock size={18} />}
                </div>
              </div>
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descrição
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Detalhes adicionais..."
              {...register('description')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(-1)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            
            {hasSupervisorRights && currentStatus === EventStatus.APPROVED ? (
               <>
                 <Button 
                    type="button"
                    variant="secondary"
                    onClick={handleDraftSubmit}
                    disabled={mutation.isPending}
                 >
                   Salvar Rascunho
                 </Button>
                 <Button 
                    type="submit" 
                    isLoading={mutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {eventId ? 'Atualizar & Aprovar' : 'Criar & Aprovar'}
                 </Button>
               </>
            ) : (
              <Button 
                type="submit" 
                isLoading={mutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {eventId ? 'Atualizar Evento' : hasSupervisorRights ? 'Salvar Rascunho' : 'Criar Solicitação'}
              </Button>
            )}
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Aprovar Evento Automaticamente?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Este evento será criado com status <span className="font-semibold text-green-700">APROVADO</span> e sincronizado instantaneamente com o Google Agenda.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmAutoApprove}
                  isLoading={mutation.isPending}
                >
                  Confirmar & Criar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};