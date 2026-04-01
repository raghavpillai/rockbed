import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@rockbed/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    async beforeCreate(user) {
      // Enforce allowed email domains
      const setting = await prisma.setting.findUnique({
        where: { key: "allowed_domains" },
      });
      if (setting?.value) {
        const domains = setting.value
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);
        if (domains.length > 0) {
          const emailDomain = user.email.split("@")[1]?.toLowerCase();
          if (!emailDomain || !domains.includes(emailDomain)) {
            throw new Error(
              `Email domain not allowed. Permitted: ${domains.join(", ")}`
            );
          }
        }
      }
      return user;
    },
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
