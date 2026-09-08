/**
 * Messages d'erreur d'authentification — mêmes règles que le Web
 * (src/pages/Auth.tsx) pour des retours utilisateur identiques.
 */
function authErrorCode(msg: string): string {
  const text = msg || "";
  if (text.includes("InvalidAccountId")) return "InvalidAccountId";
  if (text.includes("InvalidSecret")) return "InvalidSecret";
  if (text.includes("InvalidCredentials")) return "InvalidCredentials";
  return text;
}

export function getSignInErrorMessage(msg: string): string {
  const code = authErrorCode(msg);
  if (code === "InvalidAccountId") return "Aucun compte trouvé avec cet email";
  if (code === "InvalidSecret" || code === "InvalidCredentials") return "Mot de passe ou e-mail erronée";
  return msg || "Mot de passe ou e-mail erronée";
}

export function getSignUpErrorMessage(msg: string): string {
  if (msg.toLowerCase().includes("already exists")) return "Cet email est déjà utilisé";
  const code = authErrorCode(msg);
  if (code === "InvalidSecret" || code === "InvalidCredentials") return "Email déjà utilisé avec un mot de passe différent";
  if (code === "InvalidAccountId" || msg === "Invalid state: code is not a function") return "Erreur lors de l'inscription";
  if (msg.toLowerCase().includes("password")) return "Le mot de passe ne respecte pas les exigences de sécurité";
  return msg || "Erreur lors de l'inscription";
}

export function getResetErrorMessage(msg: string): string {
  const code = authErrorCode(msg);
  if (code === "InvalidAccountId" || msg.toLowerCase().includes("user")) return "Aucun compte trouvé avec cet email";
  return msg || "Erreur lors de l'envoi du code";
}

export function getResetVerifyErrorMessage(msg: string): string {
  return msg ? "Code invalide ou expiré" : "Code invalide ou expiré";
}
