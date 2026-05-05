import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions = {
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
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      // Only delete massive base64 images from the JWT cookie. Keep standard Google URLs.
      if (token.picture && token.picture.startsWith('data:image')) {
        delete token.picture;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;

        // Dynamically fetch the image directly from the DB so we bypass the strict 4KB cookie limit
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { image: true }
          });
          if (dbUser?.image) {
            session.user.image = dbUser.image;
          } else if (token.picture) {
            session.user.image = token.picture; // Fallback to Google image URL if in token
          }
        } catch (e) {
          console.error("Failed to fetch user image for session:", e);
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
