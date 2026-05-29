import { useState, useEffect } from "react";
import { Search, FileText, Printer, Calendar, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { fmtBRL } from "../lib/diarias";

interface DiariaHistorico {
  id: string;
  nome: string;
  credor: string;
  cpf: string;
  matricula: string;
  cargo: string;
  classe: string;
  destino: string;
  cidade: string;
  uf: string;
  data_saida: string;
  data_retorno: string;
  total_horas: number;
  quantidade_diarias: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
}

export default function RelatoriosDiarias() {
  const [diarias, setDiarias] = useState<DiariaHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroData, setFiltroData] = useState("");

  const carregarDiarias = async () => {
    setLoading(true);
    let query = supabase.from("diarias_historico").select("*").order("created_at", { ascending: false });

    if (filtroData) {
      const dataInicio = new Date(filtroData);
      dataInicio.setHours(0, 0, 0, 0);
      const dataFim = new Date(filtroData);
      dataFim.setHours(23, 59, 59, 999);
      query = query.gte("created_at", dataInicio.toISOString()).lte("created_at", dataFim.toISOString());
    }

    const { data, error } = await query;
    if (!error && data) setDiarias(data);
    setLoading(false);
  };

  useEffect(() => {
    carregarDiarias();
  }, [filtroData]);

  const deletarDiaria = async (id: string) => {
    if (confirm("Deseja excluir este registro?")) {
      const { error } = await supabase.from("diarias_historico").delete().eq("id", id);
      if (error) toast.error("Erro ao excluir");
      else {
        toast.success("Registro excluído");
        carregarDiarias();
      }
    }
  };

  const imprimirDiaria = (diaria: DiariaHistorico) => {
    const janela = window.open("", "_blank");
    if (!janela) return;

    janela.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Diária - ${diaria.nome}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #1e3a5f; }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 8px; border: 1px solid #ddd; }
        .info-table td:first-child { background: #f5f5f5; font-weight: bold; width: 30%; }
        .total { font-size: 18px; font-weight: bold; color: #1e3a5f; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #1e3a5f; }
        .assinaturas { margin-top: 50px; display: flex; justify-content: space-between; }
        .assinatura { text-align: center; width: 45%; }
        .linha { border-top: 1px solid #000; width: 100%; margin-top: 30px; padding-top: 5px; }
        @media print { button { display: none; } }
      </style>
      </head>
      <body>
        <button onclick="window.print()" style="margin-bottom:20px;padding:10px 20px;">🖨️ Imprimir</button>
        <div class="header">
          <div class="title">Polícia Militar do Acre</div>
          <div class="subtitle">Relatório de Cálculo de Diárias - IN nº 001/2026</div>
        </div>
        <h3>Dados do Solicitante</h3>
        <table class="info-table">
          <tr><td>Nome</td><td>${diaria.nome}</td></tr>
          ${diaria.matricula ? `<tr><td>Matrícula</td><td>${diaria.matricula}</td></tr>` : ""}
          ${diaria.cpf ? `<tr><td>CPF</td><td>${diaria.cpf}</td></tr>` : ""}
        </table>
        <h3>Dados do Deslocamento</h3>
        <table class="info-table">
          <tr><td>Cargo</td><td>${diaria.cargo}</td></tr>
          <tr><td>Classe</td><td>${diaria.classe}</td></tr>
          <tr><td>Destino</td><td>${diaria.destino}${diaria.cidade ? ` - ${diaria.cidade}` : ""}</td></tr>
          <tr><td>Período</td><td>${new Date(diaria.data_saida).toLocaleString()} até ${new Date(diaria.data_retorno).toLocaleString()}</td></tr>
          <tr><td>Total de Horas</td><td>${diaria.total_horas.toFixed(1)} horas</td></tr>
          <tr><td>Quantidade de Diárias</td><td>${diaria.quantidade_diarias}</td></tr>
          <tr><td>Valor Unitário</td><td>${fmtBRL(diaria.valor_unitario)}</td></tr>
        </table>
        <div class="total">VALOR TOTAL: ${fmtBRL(diaria.valor_total)}</div>
        <div class="assinaturas">
          <div class="assinatura"><div class="linha"></div><div>Proponente</div></div>
          <div class="assinatura"><div class="linha"></div><div>Ordenador de Despesas</div></div>
        </div>
      </body>
      </html>
    `);
    janela.document.close();
  };

  const diariasFiltradas = diarias.filter(d => 
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.matricula?.includes(searchTerm) ||
    d.cpf?.includes(searchTerm)
  );

  const totalGeral = diariasFiltradas.reduce((sum, d) => sum + d.valor_total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-xl font-semibold">Relatórios de Diárias</h2><p className="text-sm text-gray-500">{diarias.length} registros</p></div>
        <button onClick={carregarDiarias} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nome, matrícula ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm" />
        </div>
      </div>

      {diariasFiltradas.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex justify-between">
            <div><p className="text-sm text-gray-600">Registros</p><p className="text-2xl font-bold text-blue-900">{diariasFiltradas.length}</p></div>
            <div><p className="text-sm text-gray-600">Total indenizado</p><p className="text-2xl font-bold text-blue-900">{fmtBRL(totalGeral)}</p></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : diariasFiltradas.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center"><FileText className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-2 text-gray-500">Nenhuma diária encontrada</p></div>
      ) : (
        <div className="space-y-3">
          {diariasFiltradas.map((diaria) => (
            <div key={diaria.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{diaria.nome}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>📅 {new Date(diaria.created_at).toLocaleDateString("pt-BR")}</span>
                    <span>🎖️ {diaria.cargo}</span>
                    <span>📊 {diaria.quantidade_diarias} diária(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-900">{fmtBRL(diaria.valor_total)}</span>
                  <button onClick={() => imprimirDiaria(diaria)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600"><Printer className="h-4 w-4" /></button>
                  <button onClick={() => deletarDiaria(diaria.id)} className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}