import { useState, useEffect } from "react";
import { Upload, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

interface Credor {
  id: string;
  nome_completo: string;
  credor: string;
}

export default function GerenciarCredores() {
  const [credores, setCredores] = useState<Credor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCredor, setNovoCredor] = useState("");
  const [importando, setImportando] = useState(false);

  const carregarCredores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pessoas")
      .select("id, nome_completo, credor")
      .not("credor", "is", null)
      .order("nome_completo");

    if (!error && data) {
      setCredores(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarCredores();
  }, []);

  const normalizarTexto = (texto: string): string => {
    return texto
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const adicionarCredor = async () => {
    if (!novoNome.trim() || !novoCredor.trim()) {
      toast.error("Preencha nome e credor");
      return;
    }

    const credorLimpo = novoCredor.replace(/\D/g, "");
    const nomeNormalizado = normalizarTexto(novoNome);

    const { error } = await supabase.from("pessoas").insert({
      nome_completo: novoNome.toUpperCase(),
      nome_normalizado: nomeNormalizado,
      credor: credorLimpo,
    });

    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
    } else {
      toast.success("Credor adicionado");
      setNovoNome("");
      setNovoCredor("");
      setShowModal(false);
      carregarCredores();
    }
  };

  const removerCredor = async (id: string, nome: string) => {
    if (confirm(`Deseja remover "${nome}"?`)) {
      const { error } = await supabase.from("pessoas").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao remover");
      } else {
        toast.success("Credor removido");
        carregarCredores();
      }
    }
  };

  const apagarTodos = async () => {
    if (confirm("ATENÇÃO: Isso apagará TODOS os credores. Continuar?")) {
      const { error } = await supabase.from("pessoas").delete().not("credor", "is", null);
      if (error) {
        toast.error("Erro ao apagar todos");
      } else {
        toast.success("Todos os credores foram removidos");
        carregarCredores();
      }
    }
  };

  const importarCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportando(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const linhas = text.split("\n");
      const cabecalho = linhas[0].toLowerCase();

      if (!cabecalho.includes("nome") || !cabecalho.includes("credor")) {
        toast.error("Arquivo deve ter colunas 'NOME' e 'CREDOR'");
        setImportando(false);
        return;
      }

      const novosCredores: any[] = [];

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        const partes = linha.split(",");
        const nome = partes[0]?.trim();
        const credorRaw = partes[1]?.trim();

        if (!nome || !credorRaw) continue;

        const credor = credorRaw.replace(/\D/g, "");
        if (!credor) continue;

        novosCredores.push({
          nome_completo: nome.toUpperCase(),
          nome_normalizado: normalizarTexto(nome),
          credor: credor,
        });
      }

      let inseridos = 0;
      for (const credor of novosCredores) {
        const { error } = await supabase.from("pessoas").upsert(credor, {
          onConflict: "nome_normalizado",
        });
        if (!error) inseridos++;
      }

      toast.success(`${inseridos} credores importados`);
      carregarCredores();
      setImportando(false);
    };

    reader.readAsText(file, "ISO-8859-1");
    event.target.value = "";
  };

  const credoresFiltrados = credores.filter(
    (c) =>
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.credor.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Gerenciamento de Credores</h2>
          <p className="text-sm text-gray-500">{credores.length} registros</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={apagarTodos}
            className="flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Apagar Todos
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <Upload className="mx-auto h-10 w-10 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium">Importar Planilha</h3>
        <p className="text-xs text-gray-500">Colunas: NOME e CREDOR (CSV)</p>
        <div className="mt-3">
          <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            {importando ? "Importando..." : "Selecionar arquivo"}
            <input type="file" accept=".csv" onChange={importarCSV} className="hidden" disabled={importando} />
          </label>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou credor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Credor</th>
                  <th className="px-4 py-3 text-center w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {credoresFiltrados.map((credor) => (
                  <tr key={credor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{credor.nome_completo}</td>
                    <td className="px-4 py-2 font-mono">{credor.credor}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removerCredor(credor.id, credor.nome_completo)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adicionar Credor</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Credor</label>
                <input
                  type="text"
                  value={novoCredor}
                  onChange={(e) => setNovoCredor(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-md border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={adicionarCredor} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm text-white">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}