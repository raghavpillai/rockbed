import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// @ts-ignore - type inference requires local module reference
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
