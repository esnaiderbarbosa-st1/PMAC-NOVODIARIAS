import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface Pessoa {
  id: string;
  nome_completo: string;
  nome_normalizado: string;
  credor: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  matricula: string | null;
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function usePessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .order('nome_normalizado');
    
    if (!error && data) {
      setPessoas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { pessoas, loading, reload: load };
}