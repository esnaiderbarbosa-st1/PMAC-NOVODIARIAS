import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Info, ScrollText, ShieldCheck, Check, X } from "lucide-react";
import { toast } from "sonner";
import { CARGOS, DESTINO_LABELS, calcular, fmtBRL, type Destino } from "../lib/diarias";
import { usePessoas, normalizar } from "../hooks/usePessoas";
import { isValidCPF, maskCPF, onlyDigits } from "../lib/cpf";
import { maskMatricula, isValidMatricula, maskDataNasc, isValidDataNasc, dataNascToISO, isoToDataNasc } from "../lib/matricula";
import { UFS } from "../lib/ufs";
import { supabase } from "../integrations/supabase/client";

function parseDT(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export default function CalculadoraDiarias() {
  const { pessoas, reload } = usePessoas();
  const [nome, setNome] = useState("");
  const [credor, setCredor] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [matricula, setMatricula] = useState("");
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [cargoId, setCargoId] = useState<string>("soldado");
  const [pracaNS, setPracaNS] = useState(false);
  const [destino, setDestino] = useState<Destino>("interestadual");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("AC");
  const [saidaStr, setSaidaStr] = useState("");
  const [retornoStr, setRetornoStr] = useState("");
  const [alimentacao, setAlimentacao] = useState(false);
  const [hospedagem, setHospedagem] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const cargo = CARGOS.find((c) => c.id === cargoId);
  const isPraca = !!cargo?.isPraca;

  useEffect(() => {
    if (destino === "local") setUf("AC");
    if (destino === "intl_fronteira") {
      setUf("Peru");
      if (!cidade) setCidade("Madre de Dios");
    }
    if (destino === "intl_outros" && uf !== "EX") setUf("EX");
  }, [destino]);

  const sugestoes = useMemo(() => {
    if (nome.length < 2) return [];
    const q = normalizar(nome);
    return pessoas.filter((p) => p.nome_normalizado.includes(q)).slice(0, 8);
  }, [nome, pessoas]);

  useEffect(() => {
    const q = normalizar(nome);
    const exata = pessoas.find((p) => p.nome_normalizado === q);
    if (exata) {
      setPessoaId(exata.id);
      if (exata.credor && !credor) setCredor(exata.credor);
      if (exata.cpf && !cpf) setCpf(maskCPF(exata.cpf));
      if (exata.data_nascimento && !dataNasc) setDataNasc(isoToDataNasc(exata.data_nascimento));
      if (exata.matricula && !matricula) setMatricula(exata.matricula);
    } else {
      setPessoaId(null);
    }
  }, [nome, pessoas]);

  const cpfDigits = onlyDigits(cpf);
  const cpfValido = cpfDigits.length === 0 || isValidCPF(cpfDigits);
  const credorValido = !credor || credor.length >= 5;
  const dataNascValida = !dataNasc || isValidDataNasc(dataNasc);
  const matriculaValida = !matricula || isValidMatricula(matricula);
  const nomeTrimAtual = nome.trim();
  const nomeValido = nomeTrimAtual.length >= 3 && nomeTrimAtual.split(/\s+/).length >= 2;
  const pessoaAtual = pessoaId ? pessoas.find((p) => p.id === pessoaId) : null;
  const cpfNovo = cpfDigits.length === 11 ? cpfDigits : null;
  const dataNascNovo = dataNasc ? dataNascToISO(dataNasc) : null;
  const matriculaNovo = matricula || null;
  const credorNovo = credor || null;
  const temAlteracoes = nomeValido && credorValido && (cpfDigits.length === 0 || cpfValido) && dataNascValida && matriculaValida && (
    !pessoaAtual ||
    pessoaAtual.credor !== credorNovo ||
    (cpfNovo && pessoaAtual.cpf !== cpfNovo) ||
    (dataNascNovo && pessoaAtual.data_nascimento !== dataNascNovo) ||
    (matriculaNovo && pessoaAtual.matricula !== matriculaNovo)
  );

  const salvarPessoa = async () => {
    const nomeTrim = nome.trim();
    if (nomeTrim.length < 3 || nomeTrim.split(/\s+/).length < 2) {
      toast.error("Informe nome completo (nome e sobrenome)");
      return;
    }
    if (!credorValido) { toast.error("Credor inválido"); return; }
    if (cpfDigits.length > 0 && !cpfValido) { toast.error("CPF inválido"); return; }
    if (!dataNascValida) { toast.error("Data de nascimento inválida"); return; }
    if (!matriculaValida) { toast.error("Matrícula inválida"); return; }

    const payload = {
      nome_completo: nomeTrim,
      nome_normalizado: normalizar(nomeTrim),
      credor: credor || null,
      cpf: cpfDigits.length === 11 ? cpfDigits : null,
      data_nascimento: dataNasc ? dataNascToISO(dataNasc) : null,
      matricula: matricula || null,
    };

    if (pessoaId) {
      const pessoa = pessoas.find((p) => p.id === pessoaId);
      const mudou =
        pessoa?.credor !== payload.credor ||
        (payload.cpf && pessoa?.cpf !== payload.cpf) ||
        (payload.data_nascimento && pessoa?.data_nascimento !== payload.data_nascimento) ||
        (payload.matricula && pessoa?.matricula !== payload.matricula);
      if (!mudou) return;
      const update: any = { credor: payload.credor };
      if (payload.cpf) update.cpf = payload.cpf;
      if (payload.data_nascimento) update.data_nascimento = payload.data_nascimento;
      if (payload.matricula) update.matricula = payload.matricula;
      const { error } = await supabase.from("pessoas").update(update).eq("id", pessoaId);
      if (error) {
        if (!error.message.includes("duplicate")) toast.error("Erro ao salvar: " + error.message);
      } else {
        toast.success("Dados atualizados");
        reload();
      }
    } else {
      const { data, error } = await supabase.from("pessoas").insert(payload).select("id").single();
      if (error) {
        if (!error.message.includes("duplicate")) toast.error("Erro ao salvar: " + error.message);
      } else {
        if (data?.id) setPessoaId(data.id);
        toast.success("Pessoa salva na base");
        reload();
      }
    }
  };

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

  const salvarHistorico = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do solicitante antes de salvar");
      return;
    }
    if (!resultado.cargo || resultado.erro) {
      toast.error("Preencha todos os dados do deslocamento");
      return;
    }
    if (!saidaStr || !retornoStr) {
      toast.error("Informe as datas de saída e retorno");
      return;
    }

    setSalvando(true);
    const saidaDate = parseDT(saidaStr);
    const retornoDate = parseDT(retornoStr);

    const historico = {
      pessoa_id: pessoaId,
      nome: nome.trim(),
      credor: credor || null,
      cpf: cpf || null,
      matricula: matricula || null,
      cargo: cargoId,
      classe: resultado.classeAplicada,
      destino: destino,
      cidade: cidade || null,
      uf: uf || null,
      data_saida: saidaDate?.toISOString(),
      data_retorno: retornoDate?.toISOString(),
      total_horas: resultado.totalHoras,
      quantidade_diarias: resultado.quantidadeDiarias,
      valor_unitario: resultado.valorUnitario,
      valor_total: resultado.valorTotal,
    };

    const { error } = await supabase.from("diarias_historico").insert(historico);
    if (error) {
      toast.error("Erro ao salvar histórico: " + error.message);
    } else {
      toast.success("✅ Diária salva no histórico com sucesso!");
    }
    setSalvando(false);
  };

  const grupos = useMemo(() => {
    const g: Record<string, typeof CARGOS> = {};
    CARGOS.forEach((c) => {
      g[c.grupo] = g[c.grupo] || [];
      g[c.grupo].push(c);
    });
    return g;
  }, []);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(340px,30%)_1fr]">
      <section>
        <div className="rounded-lg border bg-white p-6 shadow-sm sticky top-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Configuração da Viagem
          </h2>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Nome completo</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setShowSugestoes(true); }}
                onFocus={() => setShowSugestoes(true)}
                onBlur={() => { setTimeout(() => setShowSugestoes(false), 150); }}
                placeholder="Digite ou busque..."
                autoComplete="off"
              />
              {showSugestoes && sugestoes.length > 0 && !pessoaId && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-56 overflow-auto">
                  {sugestoes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNome(s.nome_completo);
                        if (s.credor) setCredor(s.credor);
                        if (s.cpf) setCpf(maskCPF(s.cpf));
                        setShowSugestoes(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      <div className="font-medium">{s.nome_completo}</div>
                      {s.credor && <div className="text-xs text-gray-500">{s.credor}</div>}
                    </button>
                  ))}
                </div>
              )}
              {pessoaId && (
                <p className="text-[11px] text-green-600 flex items-center gap-1 mt-1">
                  <Check className="h-3 w-3" /> Encontrado na base
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Credor (Sefaz)</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={credor}
                onChange={(e) => setCredor(e.target.value.replace(/\D/g, ""))}
                placeholder="Apenas números"
              />
              {credor && credor.length < 5 && (
                <p className="text-[11px] text-red-600 mt-1">Credor deve ter pelo menos 5 dígitos</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">CPF</label>
              <input
                className={`w-full rounded-md border px-3 py-2 text-sm ${cpfDigits.length > 0 && !cpfValido ? "border-red-500" : "border-gray-300"}`}
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
              />
              {cpfDigits.length > 0 && (
                <p className={`text-[11px] flex items-center gap-1 mt-1 ${cpfValido ? "text-green-600" : "text-red-600"}`}>
                  {cpfValido ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {cpfValido ? "CPF válido" : "CPF inválido"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Data de nascimento</label>
                <input
                  className={`w-full rounded-md border px-3 py-2 text-sm ${dataNasc && !isValidDataNasc(dataNasc) ? "border-red-500" : "border-gray-300"}`}
                  value={dataNasc}
                  onChange={(e) => setDataNasc(maskDataNasc(e.target.value))}
                  placeholder="DD/MM/AAAA"
                />
                {dataNasc && !isValidDataNasc(dataNasc) && (
                  <p className="text-[11px] text-red-600 mt-1">Data inválida</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Matrícula</label>
                <input
                  className={`w-full rounded-md border px-3 py-2 text-sm ${matricula && !isValidMatricula(matricula) ? "border-red-500" : "border-gray-300"}`}
                  value={matricula}
                  onChange={(e) => setMatricula(maskMatricula(e.target.value))}
                  placeholder="0000000-0"
                />
                {matricula && !isValidMatricula(matricula) && (
                  <p className="text-[11px] text-red-600 mt-1">Formato: 7 dígitos + dígito</p>
                )}
              </div>
            </div>

            {nomeValido && temAlteracoes && (
              <button
                type="button"
                onClick={salvarPessoa}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                {pessoaId ? "Atualizar cadastro" : "Salvar na base"}
              </button>
            )}

            <hr className="my-4" />

            <div>
              <label className="block text-sm font-medium mb-1">Posto / Graduação</label>
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

            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Cidade</label>
                <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UF/País</label>
                {destino.startsWith("intl") ? (
                  <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={uf} onChange={(e) => setUf(e.target.value)} />
                ) : (
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={uf} onChange={(e) => setUf(e.target.value)}>
                    {UFS.map(([sigla, nome]) => (
                      <option key={sigla} value={sigla}>{sigla} — {nome}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Saída da sede</label>
              <input type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={saidaStr} onChange={(e) => setSaidaStr(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Retorno à sede</label>
              <input type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={retornoStr} onChange={(e) => setRetornoStr(e.target.value)} />
            </div>

            <hr className="my-4" />

            <div>
              <label className="block text-sm font-medium mb-2">Fornecimentos pela Administração</label>
              <div className="flex items-center justify-between rounded-md border p-3 mb-2">
                <label className="text-sm">Alimentação fornecida</label>
                <input type="checkbox" className="h-4 w-4" checked={alimentacao} onChange={(e) => setAlimentacao(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <label className="text-sm">Hospedagem fornecida</label>
                <input type="checkbox" className="h-4 w-4" checked={hospedagem} onChange={(e) => setHospedagem(e.target.checked)} />
              </div>
            </div>

            <hr className="my-4" />

            <button
              onClick={salvarHistorico}
              disabled={salvando || !nome.trim() || !resultado.cargo || resultado.erro}
              className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? "💾 Salvando..." : "💾 Salvar diária para impressão"}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <div className="mb-6 border-b-2 pb-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Estado do Acre · Polícia Militar</p>
            <h2 className="font-serif text-2xl font-bold text-blue-900">Relatório de Cálculo de Diárias</h2>
            <p className="mt-1 text-xs text-gray-500">Decreto nº 11.762/2025 · Emitido em {hoje}</p>
          </div>

          {(nome || credor || cpf || dataNasc || matricula) && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border bg-gray-50 p-4 text-sm">
              <div><p className="text-[10px] uppercase text-gray-500">Solicitante</p><p className="font-medium">{nome || "—"}</p></div>
              <div><p className="text-[10px] uppercase text-gray-500">CPF</p><p className="font-mono">{cpf || "—"}</p></div>
              <div><p className="text-[10px] uppercase text-gray-500">Credor</p><p className="font-medium">{credor || "—"}</p></div>
              <div><p className="text-[10px] uppercase text-gray-500">Data de nascimento</p><p className="font-mono">{dataNasc || "—"}</p></div>
              <div><p className="text-[10px] uppercase text-gray-500">Matrícula</p><p className="font-mono">{matricula || "—"}</p></div>
            </div>
          )}

          {resultado.erro || !resultado.cargo ? (
            <div className="flex items-start gap-3 rounded-md border border-yellow-400 bg-yellow-50 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div><p className="font-medium">Aguardando dados</p><p className="text-gray-500">{resultado.erro || "Preencha o formulário ao lado."}</p></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-md border bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase text-gray-500">Período total</p>
                  <p className="mt-1 font-serif text-xl font-semibold text-blue-900">{resultado.dias}d {Math.floor(resultado.horasRestantes)}h</p>
                  <p className="mt-0.5 text-xs text-gray-500">{resultado.totalHoras.toFixed(1)} horas</p>
                </div>
                <div className="rounded-md border bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase text-gray-500">Classe aplicada</p>
                  <p className="mt-1 font-serif text-xl font-semibold text-blue-900">Classe {resultado.classeAplicada}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{resultado.cargo?.label}</p>
                </div>
                <div className="rounded-md border bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase text-gray-500">Destino</p>
                  <p className="mt-1 font-serif text-xl font-semibold text-blue-900">{cidade || resultado.destinoLabel.split(" ")[0]}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{resultado.destinoLabel}</p>
                </div>
              </div>

              <div className="mt-6 rounded-md border bg-gray-50 p-5">
                <h3 className="mb-3 font-serif text-base font-semibold text-blue-900">Memória de Cálculo</h3>
                <ul className="space-y-1.5 text-sm">
                  {resultado.detalhamento.map((d, i) => (
                    <li key={i} className="flex gap-2"><span className="text-blue-600">•</span><span>{d}</span></li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b bg-gray-50">
                      <td className="px-4 py-3">Valor unitário da diária</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{fmtBRL(resultado.valorUnitario)}</td>
                    </tr>
                    <tr className="border-b bg-white">
                      <td className="px-4 py-3">Quantidade de diárias</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{resultado.quantidadeDiarias.toLocaleString("pt-BR")}</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="px-4 py-3 font-serif text-base font-semibold text-blue-900">Valor Total da Indenização</td>
                      <td className="px-4 py-3 text-right font-mono text-lg font-bold text-blue-900">{fmtBRL(resultado.valorTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-start gap-2 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600" />
                  <span>Solicitação de diária deve ser feita com 5 dias úteis de antecedência (Art. 7º).</span>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>O uso de veículo particular é vedado, salvo exceções com autorização (Art. 3º, §3º).</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}