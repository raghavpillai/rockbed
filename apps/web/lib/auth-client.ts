"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authClient: any = createAuthClient({
  plugins: [adminClient()],
});

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession as () => {
  data: { user: { name: string; email: string; image?: string; role?: string }; session: any } | null;
  isPending: boolean;
};
