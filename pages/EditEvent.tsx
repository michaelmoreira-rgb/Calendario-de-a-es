import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { EventForm } from '../components/EventForm';
import { API_BASE_URL } from '../constants';

const fetchEvent = async (id: string) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar evento');
  return res.json();
};

export const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEvent(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (isError || !event) {
    return (
      <Layout>
        <div className="text-center p-12 text-red-600">
          Erro ao carregar detalhes do evento.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Editar Evento</h1>
        </div>
        <EventForm initialData={event} eventId={id} />
      </div>
    </Layout>
  );
};