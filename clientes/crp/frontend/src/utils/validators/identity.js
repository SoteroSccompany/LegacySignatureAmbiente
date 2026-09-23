const EMAIL_RE = /\S+@\S+\.\S+/;
/** Alinha com UsuarioController.changePasswordLoged */
const SENHA_FORTE_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const isValidEmail = (email) =>
  typeof email === "string" && EMAIL_RE.test(email.trim());

export const isStrongPassword = (senha) =>
  typeof senha === "string" && SENHA_FORTE_RE.test(senha);

export const isValidOtp = (token) =>
  typeof token === "string" && /^\d{6}$/.test(token);

export const isValidNome = (nome) =>
  typeof nome === "string" && nome.trim().length >= 3;

export const onlyDigits = (value) =>
  String(value || "").replace(/\D/g, "");

/** Aceita fixo (10) ou celular (11) com DDD; sempre validado sobre os dígitos. */
export const isValidTelefone = (telefone) => {
  const digits = onlyDigits(telefone);
  return digits.length === 10 || digits.length === 11;
};

/** Máscara simples de exibição — o backend recebe sempre só dígitos (onlyDigits). */
export const formatTelefone = (telefone) => {
  const digits = onlyDigits(telefone).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

/** Máscara simples de exibição — o backend recebe sempre só dígitos (onlyDigits). */
export const formatCpf = (cpf) => {
  const digits = onlyDigits(cpf).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const isValidCpf = (cpf) => {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === Number(digits[10]);
};

export const MSG = {
  emailObrigatorio: "O campo e-mail é obrigatório",
  emailInvalido: "Insira um e-mail válido",
  senhaObrigatoria: "O campo senha é obrigatório",
  senhaFraca:
    "Nova senha deve ter no mínimo 8 caracteres, com letra, número e símbolo.",
  senhaIgual: "Nova senha não pode ser igual a senha antiga",
  senhaConfere: "As senhas não conferem",
  otpInvalido: "Informe um código de 6 dígitos",
  nomeInvalido: "Nome deve ter no mínimo 3 caracteres",
  cpfInvalido: "CPF inválido",
  telefoneInvalido: "Informe um telefone válido com DDD",
};
