import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
      if (domain && user.email && !user.email.toLowerCase().endsWith(`@${domain}`)) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      await logActivity("auth.signin", {
        userId: user.id,
        meta: { provider: account?.provider },
      });
      // Auto-enroll into the default course on first login.
      const slug = process.env.DEFAULT_COURSE_SLUG;
      if (slug && user.id) {
        const course = await db.course.findUnique({ where: { slug } });
        if (course) {
          await db.enrollment.upsert({
            where: { userId_courseId: { userId: user.id, courseId: course.id } },
            create: { userId: user.id, courseId: course.id },
            update: {},
          });
        }
      }
    },
  },
});
