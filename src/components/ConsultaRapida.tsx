import { useMemo, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import { CARGOS, DESTINO_LABELS, calcular, fmtBRL, type Destino } from "../lib/diarias";

function parseDT(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export default function ConsultaRapida() {
  const [cargoId, setCargoId] = useState<string>("soldado");
  const [pracaNS, setPracaNS] = useState(false);
  const [destino, setDestino] = useState<Destino>("interestadual");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("AC");
  const [saidaStr, setSaidaStr] = useState("");
  const [retornoStr, setRetornoStr] = useState("");
  const [alimentacao, setAlimentacao] = useState(false);
  const [hospedagem, setHospedagem] = useState(false);

  const cargo = CARGOS.find((c) => c.id === cargoId);
  const isPraca = !!cargo?.isPraca;

  const resultado = useMemo(
    () =>
      calcular({
        cargoId,
        pracaNivelSuperior: pracaNS,
        destino,
        saida: parseDT(saidaStr),
        retorno: parseDT(retornoStr),
        alimentacao,
        hospedagem,
      }),
    [cargoId, pracaNS, destino, saidaStr, retornoStr, alimentacao, hospedagem]
  );

  const grupos = useMemo(() => {
    const g: Record<string, typeof CARGOS> = {};
    CARGOS.forEach((c) => {
      g[c.grupo] = g[c.grupo] || [];
      g[c.grupo].push(c);
    });
    return g;
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Consulta Rápida</h2>
          <span className="ml-auto text-xs text-gray-400">Apenas consulta — não salva</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cargo / Posto / Graduação</label>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={cargoId} onChange={(e) => setCargoId(e.target.value)}>
              {Object.entries(grupos).map(([grupo, items]) => (
                <optgroup key={grupo} label={grupo}>
                  {items.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {isPraca && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <label className="text-sm font-medium">Possui nível superior?</label>
                <p className="text-xs text-gray-500">Habilita Classe IV</p>
              </div>
              <input type="checkbox" className="h-4 w-4" checked={pracaNS} onChange={(e) => setPracaNS(e.target.checked)} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Destino</label>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={destino} onChange={(e) => setDestino(e.target.value as Destino)}>
              <option value="local">{DESTINO_LABELS.local}</option>
              <option value="interestadual">{DESTINO_LABELS.interestadual}</option>
              <option value="intl_fronteira">{DESTINO_LABELS.intl_fronteira}</option>
              <option value="intl_outros">{DESTINO_LABELS.intl_outros}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Cidade (opcional)</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Rio Branco" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">UF/País</label>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={uf} onChange={(e) => setUf(e.target.value)} placeholder="UF" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data e Hora de Saída</label>
            <input type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={saidaStr} onChange={(e) => setSaidaStr(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data e Hora de Retorno</label>
            <input type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={retornoStr} onChange={(e) => setRetornoStr(e.target.value)} />
          </div>

          <hr className="my-4" />
          <div>
            <label className="block text-sm font-medium mb-2">Fornecimentos pela Administração</label>
            <div className="flex items-center justify-between rounded-md border p-3 mb-2">
              <label className="text-sm">Alimentação fornecida?</label>
              <input type="checkbox" className="h-4 w-4" checked={alimentacao} onChange={(e) => setAlimentacao(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <label className="text-sm">Hospedagem fornecida?</label>
              <input type="checkbox" className="h-4 w-4" checked={hospedagem} onChange={(e) => setHospedagem(e.target.checked)} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 border-b pb-3">
          <h3 className="font-serif text-lg font-semibold text-blue-900">Resultado da Consulta</h3>
          <p className="text-xs text-gray-500">Instrução Normativa nº 001/2026 — PMAC</p>
        </div>

        {!resultado?.cargo || resultado?.erro || !saidaStr || !retornoStr ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mb-3" />
            <p className="text-gray-500">Preencha os dados ao lado</p>
            <p className="text-xs text-gray-400 mt-1">Informe cargo, destino e período para visualizar o cálculo</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-gray-50 p-3 text-center">
                <p className="text-[10px] uppercase text-gray-500">Classe</p>
                <p className="text-2xl font-bold text-blue-900">{resultado.classeAplicada}</p>
                <p className="text-[10px] text-gray-500">{cargo?.label?.split(" ")[0]}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3 text-center">
                <p className="text-[10px] uppercase text-gray-500">Valor Unitário</p>
                <p className="text-xl font-bold text-blue-900">{fmtBRL(resultado.valorUnitario || 0)}</p>
                <p className="text-[10px] text-gray-500">por diária</p>
              </div>
            </div>

            <div className="rounded-md border bg-blue-50 p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-600">Período total</p>
                  <p className="text-lg font-semibold">{resultado.dias}d {Math.floor(resultado.horasRestantes)}h</p>
                  <p className="text-[10px] text-gray-500">{resultado.totalHoras?.toFixed(1)} horas</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Diárias</p>
                  <p className="text-2xl font-bold">{resultado.quantidadeDiarias || 0}</p>
                  <p className="text-[10px] text-gray-500">{resultado.tipoDiariaTexto}</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border-2 border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-xs uppercase text-gray-500">Valor Total da Indenização</p>
              <p className="text-3xl font-bold text-blue-900">{fmtBRL(resultado.valorTotal || 0)}</p>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-700">Ver memória de cálculo</summary>
              <ul className="mt-2 space-y-1 pl-4 text-gray-600">
                {resultado.detalhamento?.map((d, i) => (
                  <li key={i} className="list-disc">{d}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
