import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in the environment",
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }

      if (profile) {
        const typedProfile = profile as { email?: string | null; picture?: string | null; name?: string | null };
        token.email = typedProfile.email ?? token.email;
        token.picture = typedProfile.picture ?? token.picture;
        token.name = typedProfile.name ?? token.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? undefined;
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.image = token.picture ?? session.user.image;
      }

      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }

      return session;
    },
  },
};
