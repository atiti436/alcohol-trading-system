import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

export const authOptions: NextAuthOptions = {
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
      // 首次登入時從資料庫載入使用者資料
      if (account && user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role as Role
          token.investor_id = dbUser.investor_id || undefined
        } else {
          // 檢查是否為管理員白名單
          const adminEmails = [
            'manpan.whisky@gmail.com',
          ]

          const isAdmin = adminEmails.includes(user.email!.toLowerCase())

          // 首次登入建立使用者
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name!,
              image: user.image,
              role: isAdmin ? Role.SUPER_ADMIN : Role.PENDING,
            },
          })
          token.id = newUser.id
          token.role = newUser.role as Role
          token.investor_id = newUser.investor_id ?? undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      // 將JWT中的資訊附加到session
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.investor_id = token.investor_id as string | undefined
      }
      return session
    },
    async signIn({ user }) {
      // 嚴格：PENDING 與停用不可進系統
      if (!user?.email) return false
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
      if (dbUser) {
        if (!dbUser.is_active) return '/auth/error?reason=deactivated'
        if ((dbUser as any).role === (Role as any).PENDING) {
          await notifyAdminPending(user.email, user.name || '')
          return '/auth/pending'
        }
        return true
      }
      // 尚未建立（首次登入），視為申請中
      await notifyAdminPending(user.email, user.name || '')
      return '/auth/pending'
    },
  },
  events: {
    async signIn({ user }) {
      // 記錄登入事件
      console.log(`User signed in: ${user.email}`)
    },
    async signOut() {
      // 記錄登出事件
      console.log(`User signed out`)
    },
  },
}

async function notifyAdminPending(email: string, name: string) {
  try {
    const hook = process.env.ADMIN_WEBHOOK_URL
    if (!hook) {
      console.log(`[PENDING-APPLY] ${email} (${name}) 申請存取，請至系統核准角色`)
      return
    }
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `新用戶申請：${email} (${name})，請至系統核准角色`,
        email,
        name,
        type: 'pending_user'
      })
    })
  } catch (e) {
    console.warn('通知管理員失敗', e)
  }
}

