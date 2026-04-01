import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;

// Re-export for components that check session.user.role
export type Session = (typeof authClient)["$Infer"]["Session"];
