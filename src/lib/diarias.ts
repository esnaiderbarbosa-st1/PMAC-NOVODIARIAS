export type Destino = "local" | "interestadual" | "intl_fronteira" | "intl_outros";

export const DESTINO_LABELS: Record<Destino, string> = {
  local: "Dentro do Estado (Acre)",
  interestadual: "Fora do Estado (Interestadual)",
  intl_fronteira: "Internacional - Fronteira (Peru/Bolívia)",
  intl_outros: "Internacional - Demais Países"
};

export interface CargoOption {
  id: string;
  label: string;
  grupo: string;
  classeBase: string;
  isPraca?: boolean;
}

export const CARGOS: CargoOption[] = [
  { id: "governador", label: "Governador", grupo: "Autoridades", classeBase: "I", isPraca: false },
  { id: "vice-governador", label: "Vice-Governador", grupo: "Autoridades", classeBase: "I", isPraca: false },
  { id: "assessor-superior", label: "Assessor de Autoridade", grupo: "Autoridades", classeBase: "II", isPraca: false },
  { id: "cmt-geral", label: "Comandante-Geral", grupo: "Comando", classeBase: "II" },
  { id: "subcmt-geral", label: "Subcomandante-Geral", grupo: "Comando", classeBase: "II" },
  { id: "coronel", label: "Coronel", grupo: "Oficiais", classeBase: "III" },
  { id: "ten-cel", label: "Tenente-Coronel", grupo: "Oficiais", classeBase: "III" },
  { id: "major", label: "Major", grupo: "Oficiais", classeBase: "III" },
  { id: "capitao", label: "Capitão", grupo: "Oficiais", classeBase: "IV" },
  { id: "1ten", label: "1º Tenente", grupo: "Oficiais", classeBase: "IV" },
  { id: "2ten", label: "2º Tenente", grupo: "Oficiais", classeBase: "IV" },
  { id: "subten", label: "Subtenente", grupo: "Praças", classeBase: "V", isPraca: true },
  { id: "1sgt", label: "1º Sargento", grupo: "Praças", classeBase: "V", isPraca: true },
  { id: "2sgt", label: "2º Sargento", grupo: "Praças", classeBase: "V", isPraca: true },
  { id: "3sgt", label: "3º Sargento", grupo: "Praças", classeBase: "V", isPraca: true },
  { id: "cabo", label: "Cabo", grupo: "Praças", classeBase: "V", isPraca: true },
  { id: "soldado", label: "Soldado", grupo: "Praças", classeBase: "V", isPraca: true },
  { id: "civil-chefia", label: "Servidor Civil PMAC (cargo de chefia)", grupo: "Civis", classeBase: "III" },
  { id: "civil-ns", label: "Servidor de outro órgão c/ nível superior lotado na PMAC", grupo: "Civis", classeBase: "IV" },
  { id: "colab", label: "Colaborador Eventual", grupo: "Civis", classeBase: "III" },
];

const VALORES_CLASSES: Record<string, { interestadual: number; estadual: number }> = {
  "I": { interestadual: 1443.50, estadual: 576.50 },
  "II": { interestadual: 755.00, estadual: 288.62 },
  "III": { interestadual: 715.75, estadual: 286.25 },
  "IV": { interestadual: 538.20, estadual: 215.25 },
  "V": { interestadual: 322.90, estadual: 150.75 },
};

export function fmtBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export interface CalcularParams {
  cargoId: string;
  pracaNivelSuperior: boolean;
  destino: Destino;
  saida: Date | null;
  retorno: Date | null;
  alimentacao: boolean;
  hospedagem: boolean;
}

export function calcular(params: CalcularParams) {
  const { cargoId, pracaNivelSuperior, destino, saida, retorno, alimentacao, hospedagem } = params;
  
  const cargo = CARGOS.find(c => c.id === cargoId);
  if (!cargo) return { erro: "Cargo não encontrado" };
  
  let classeBase = cargo.classeBase;
  if (cargo.isPraca && pracaNivelSuperior && classeBase === "V") {
    classeBase = "IV";
  }
  
  if (!saida || !retorno) {
    return { erro: "Informe as datas de saída e retorno", cargo, classeBase };
  }
  
  const diffMs = retorno.getTime() - saida.getTime();
  const totalHoras = diffMs / (1000 * 60 * 60);
  const dias = Math.floor(totalHoras / 24);
  const horasRestantes = totalHoras % 24;
  
  let quantidadeDiarias = 0;
  let tipoDiariaTexto = "nenhuma";
  
  if (totalHoras > 0 && totalHoras <= 4) {
    quantidadeDiarias = 0;
    tipoDiariaTexto = "nenhuma";
  } else if (totalHoras > 4 && totalHoras < 12) {
    quantidadeDiarias = 0.5;
    tipoDiariaTexto = "meia";
  } else if (totalHoras >= 12) {
    quantidadeDiarias = 1;
    tipoDiariaTexto = "inteira";
  }
  
  let fatorReducao = 1;
  if (alimentacao || hospedagem) {
    fatorReducao = 0.5;
    tipoDiariaTexto = "meia (reduzida por fornecimento)";
  }
  
  quantidadeDiarias = quantidadeDiarias * fatorReducao;
  
  let destinoEfetivo: "interestadual" | "estadual" = destino === "local" ? "estadual" : "interestadual";
  if (destino === "intl_fronteira") destinoEfetivo = "interestadual";
  
  const valorUnitario = destinoEfetivo === "interestadual" 
    ? VALORES_CLASSES[classeBase]?.interestadual || 0
    : VALORES_CLASSES[classeBase]?.estadual || 0;
  
  const valorTotal = valorUnitario * quantidadeDiarias;
  
  const detalhamento: string[] = [
    `Classe ${classeBase} aplicada (${cargo.label})`,
    `Valor unitário: ${fmtBRL(valorUnitario)}`,
    `${quantidadeDiarias} diária(s) do tipo ${tipoDiariaTexto}`,
    `Período total: ${dias}d ${Math.floor(horasRestantes)}h (${totalHoras.toFixed(1)} horas)`,
  ];
  
  if (alimentacao || hospedagem) {
    detalhamento.push(`Redução aplicada devido ao fornecimento de ${alimentacao ? "alimentação" : ""}${alimentacao && hospedagem ? " e " : ""}${hospedagem ? "hospedagem" : ""}`);
  }
  
  return {
    cargo,
    classeAplicada: classeBase,
    dias,
    horasRestantes,
    totalHoras,
    quantidadeDiarias,
    tipoDiariaTexto,
    valorUnitario,
    valorTotal,
    fatorReducao,
    destinoLabel: DESTINO_LABELS[destino],
    detalhamento,
    erro: undefined
  };
}