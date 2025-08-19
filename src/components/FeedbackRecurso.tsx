import React, { useState } from 'react';
import { Star, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface FeedbackRecursoProps {
  recursoId: string;
  onFeedbackSubmitted?: () => void;
}

interface FeedbackData {
  rating: number;
  comment: string;
  aspectos: {
    relevancia_juridica: number;
    clareza_texto: number;
    fundamentacao: number;
    aplicabilidade: number;
  };
}

const FeedbackRecurso: React.FC<FeedbackRecursoProps> = ({ 
  recursoId, 
  onFeedbackSubmitted 
}) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    comment: '',
    aspectos: {
      relevancia_juridica: 0,
      clareza_texto: 0,
      fundamentacao: 0,
      aplicabilidade: 0
    }
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const aspectosLabels = {
    relevancia_juridica: 'Relevância Jurídica',
    clareza_texto: 'Clareza do Texto',
    fundamentacao: 'Fundamentação Legal',
    aplicabilidade: 'Aplicabilidade Prática'
  };

  const handleRatingChange = (rating: number) => {
    setFeedback(prev => ({ ...prev, rating }));
  };

  const handleAspectoChange = (aspecto: keyof typeof feedback.aspectos, rating: number) => {
    setFeedback(prev => ({
      ...prev,
      aspectos: {
        ...prev.aspectos,
        [aspecto]: rating
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (feedback.rating === 0) {
      toast.error('Por favor, selecione uma avaliação geral');
      return;
    }

    setEnviando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { error } = await supabase
        .from('feedback')
        .insert({
          resource_id: recursoId,
          user_id: user.id,
          rating: feedback.rating,
          comment: feedback.comment || null,
          aspectos_avaliacao: feedback.aspectos,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao salvar feedback:', error);
        toast.error('Erro ao enviar feedback');
        return;
      }

      setEnviado(true);
      toast.success('Feedback enviado com sucesso!');
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback');
    } finally {
      setEnviando(false);
    }
  };

  const renderStars = (rating: number, onRatingChange: (rating: number) => void, size = 'w-6 h-6') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`${size} transition-colors ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
      </div>
    );
  };

  if (enviado) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Feedback Enviado!
        </h3>
        <p className="text-green-700">
          Obrigado por sua avaliação. Ela nos ajuda a melhorar nosso agente jurídico.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Avalie este Recurso
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avaliação Geral */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Avaliação Geral *
          </label>
          <div className="flex items-center gap-3">
            {renderStars(feedback.rating, handleRatingChange, 'w-8 h-8')}
            <span className="text-sm text-gray-600 ml-2">
              {feedback.rating > 0 && (
                feedback.rating === 1 ? 'Muito Ruim' :
                feedback.rating === 2 ? 'Ruim' :
                feedback.rating === 3 ? 'Regular' :
                feedback.rating === 4 ? 'Bom' : 'Excelente'
              )}
            </span>
          </div>
        </div>

        {/* Aspectos Específicos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Aspectos Específicos
          </label>
          <div className="space-y-4">
            {Object.entries(aspectosLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex-1">{label}</span>
                <div className="flex items-center gap-2">
                  {renderStars(
                    feedback.aspectos[key as keyof typeof feedback.aspectos],
                    (rating) => handleAspectoChange(key as keyof typeof feedback.aspectos, rating),
                    'w-5 h-5'
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comentário */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentários (opcional)
          </label>
          <textarea
            value={feedback.comment}
            onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="Compartilhe suas impressões sobre o recurso gerado..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Botão de Envio */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={enviando || feedback.rating === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Feedback
              </>
            )}
          </button>
        </div>

        {/* Nota sobre privacidade */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Seu feedback é anônimo e será usado apenas para melhorar a qualidade 
            dos recursos gerados pelo nosso agente jurídico.
          </p>
        </div>
      </form>
    </div>
  );
};

export default FeedbackRecurso;