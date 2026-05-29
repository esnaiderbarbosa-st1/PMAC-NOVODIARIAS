export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskMatricula(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 7) return digits;
  return digits.replace(/(\d{7})(\d{1})/, '$1-$2');
}

export function isValidMatricula(matricula: string): boolean {
  const digits = onlyDigits(matricula);
  return digits.length === 8;
}

export function maskDataNasc(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.replace(/(\d{2})(\d+)/, '$1/$2');
  return digits.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
}

export function isValidDataNasc(data: string): boolean {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(data)) return false;
  const [, dia, mes, ano] = regex.exec(data)!;
  const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  return dataObj.getFullYear() === parseInt(ano) &&
         dataObj.getMonth() === parseInt(mes) - 1 &&
         dataObj.getDate() === parseInt(dia);
}

export function dataNascToISO(data: string): string {
  const [dia, mes, ano] = data.split('/');
  return `${ano}-${mes}-${dia}`;
}

export function isoToDataNasc(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}