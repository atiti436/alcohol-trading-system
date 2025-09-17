import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登入時，從資料庫載入使用者資訊
      if (account && user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role as Role
          token.investorId = dbUser.investorId
        } else {
          // 首次登入的新使用者，預設為員工角色
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name!,
              image: user.image,
              role: Role.EMPLOYEE,
            },
          })
          token.id = newUser.id
          token.role = newUser.role as Role
          token.investorId = newUser.investorId
        }
      }

      return token
    },
    async session({ session, token }) {
      // 將JWT中的資訊附加到session
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.investorId = token.investorId as string | undefined
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // 可以在這裡加入額外的登入檢查
      // 例如：檢查使用者是否被停用
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (dbUser && !dbUser.isActive) {
          return false // 拒絕登入
        }
      }

      return true
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // 記錄登入事件
      console.log(`User signed in: ${user.email}`)
    },
    async signOut({ session, token }) {
      // 記錄登出事件
      console.log(`User signed out`)
    },
  },
}