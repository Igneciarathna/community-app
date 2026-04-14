import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          throw new Error("Email and OTP are required");
        }

        // 1. Find the token
        const verificationToken = await prisma.verificationToken.findFirst({
          where: {
            identifier: credentials.email,
            token: credentials.otp,
          },
        });

        if (!verificationToken) {
          throw new Error("Invalid OTP");
        }

        if (verificationToken.expires < new Date()) {
          throw new Error("OTP has expired");
        }

        // 2. Token is valid, so we clean it up so it can't be reused
        await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: verificationToken.identifier,
              token: verificationToken.token,
            },
          },
        });

        // 3. Find or create the user
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          const name = credentials.email.split('@')[0] || "User";
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: name,
              image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            },
          });
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
