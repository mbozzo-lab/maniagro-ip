import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      return user.email?.endsWith("@maniagro.com") ?? false;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
