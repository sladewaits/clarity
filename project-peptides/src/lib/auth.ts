/**
 * Authentication adapter interface.
 *
 * Project Peptides is auth-provider-neutral. This interface is designed to be
 * satisfied by Auth0, Clerk, or a custom OIDC provider. The demo uses a
 * static session (see src/data/service.ts::getCurrentUser). No credentials are
 * validated in the MVP.
 */
import type { RoleKey } from "./types";

export interface Session {
  userId: string;
  orgId: string | null;
  role: RoleKey;
  name: string;
  email: string;
}

export interface AuthAdapter {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
}

/** Placeholder — throws to make clear no real auth is wired. */
export const notConnectedAuth: AuthAdapter = {
  async getSession() {
    return null;
  },
  async signIn() {
    throw new Error("Auth provider not connected. Wire Auth0/Clerk via AuthAdapter.");
  },
  async signOut() {},
};
