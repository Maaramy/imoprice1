import { describe, it, expect } from "vitest";
import {
  getSignInErrorMessage,
  getSignUpErrorMessage,
  getResetErrorMessage,
} from "@/pages/Auth";

describe("getSignInErrorMessage", () => {
  it('returns "Aucun compte trouvé" for InvalidAccountId', () => {
    expect(getSignInErrorMessage("InvalidAccountId")).toBe(
      "Aucun compte trouvé avec cet email",
    );
  });

  it('returns "Mot de passe ou e-mail erronée" for InvalidSecret', () => {
    expect(getSignInErrorMessage("InvalidSecret")).toBe(
      "Mot de passe ou e-mail erronée",
    );
  });

  it('returns "Mot de passe ou e-mail erronée" for InvalidCredentials', () => {
    expect(getSignInErrorMessage("InvalidCredentials")).toBe(
      "Mot de passe ou e-mail erronée",
    );
  });

  it('maps wrapped server error for InvalidSecret', () => {
    expect(
      getSignInErrorMessage(
        "Uncaught Error: InvalidSecret at retrieveAccount (../../node_modules/@convex-dev/auth/src/server/implementation/index.ts:602:9)",
      ),
    ).toBe("Mot de passe ou e-mail erronée");
  });

  it('maps wrapped server error for InvalidCredentials', () => {
    expect(getSignInErrorMessage("Error: InvalidCredentials")).toBe(
      "Mot de passe ou e-mail erronée",
    );
  });

  it('maps wrapped server error for InvalidAccountId', () => {
    expect(getSignInErrorMessage("Uncaught Error: InvalidAccountId")).toBe(
      "Aucun compte trouvé avec cet email",
    );
  });

  it("returns the raw message for unknown errors", () => {
    expect(getSignInErrorMessage("SomeServerError")).toBe("SomeServerError");
  });

  it("returns fallback for empty string", () => {
    expect(getSignInErrorMessage("")).toBe("Mot de passe ou e-mail erronée");
  });
});

describe("getSignUpErrorMessage", () => {
  it('returns "Cet email est déjà utilisé" for already exists', () => {
    expect(getSignUpErrorMessage("Account test@e.com already exists")).toBe(
      "Cet email est déjà utilisé",
    );
  });

  it('returns "Email déjà utilisé" for InvalidSecret', () => {
    expect(getSignUpErrorMessage("InvalidSecret")).toBe(
      "Email déjà utilisé avec un mot de passe différent",
    );
  });

  it('returns "Email déjà utilisé" for InvalidCredentials', () => {
    expect(getSignUpErrorMessage("InvalidCredentials")).toBe(
      "Email déjà utilisé avec un mot de passe différent",
    );
  });

  it('maps wrapped InvalidSecret for sign-up', () => {
    expect(getSignUpErrorMessage("Uncaught Error: InvalidSecret")).toBe(
      "Email déjà utilisé avec un mot de passe différent",
    );
  });

  it('returns generic error for InvalidAccountId', () => {
    expect(getSignUpErrorMessage("InvalidAccountId")).toBe(
      "Erreur lors de l'inscription",
    );
  });

  it('returns generic error for "code is not a function"', () => {
    expect(
      getSignUpErrorMessage("Invalid state: code is not a function"),
    ).toBe("Erreur lors de l'inscription");
  });

  it("returns password security message for password errors", () => {
    expect(getSignUpErrorMessage("Invalid password")).toBe(
      "Le mot de passe ne respecte pas les exigences de sécurité",
    );
  });

  it("returns raw message for unknown errors", () => {
    expect(getSignUpErrorMessage("UnknownError")).toBe("UnknownError");
  });

  it("returns fallback for empty string", () => {
    expect(getSignUpErrorMessage("")).toBe("Erreur lors de l'inscription");
  });
});

describe("getResetErrorMessage", () => {
  it('returns "Aucun compte trouvé" for InvalidAccountId', () => {
    expect(getResetErrorMessage("InvalidAccountId")).toBe(
      "Aucun compte trouvé avec cet email",
    );
  });

  it('returns "Aucun compte trouvé" if message includes "user"', () => {
    expect(getResetErrorMessage("No user found")).toBe(
      "Aucun compte trouvé avec cet email",
    );
  });

  it('maps wrapped InvalidAccountId for reset', () => {
    expect(getResetErrorMessage("Uncaught Error: InvalidAccountId")).toBe(
      "Aucun compte trouvé avec cet email",
    );
  });

  it("returns raw message for unknown errors", () => {
    expect(getResetErrorMessage("NetworkError")).toBe("NetworkError");
  });

  it("returns fallback for empty string", () => {
    expect(getResetErrorMessage("")).toBe("Erreur lors de l'envoi du code");
  });
});
