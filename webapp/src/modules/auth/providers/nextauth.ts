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
          token.is_active = dbUser.is_active
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
              is_active: true,
            },
          })

          // 通知管理員有新用戶申請（非管理員才通知）
          if (!isAdmin) {
            await notifyAdminPending(user.email!, user.name || '')
          }

          token.id = newUser.id
          token.role = newUser.role as Role
          token.investor_id = newUser.investor_id ?? undefined
          token.is_active = newUser.is_active
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
      // 檢查 email 是否存在
      if (!user?.email) return false

      // 檢查是否為管理員白名單
      const adminEmails = [
        'manpan.whisky@gmail.com',
      ]
      const isAdmin = adminEmails.includes(user.email.toLowerCase())

      // 如果是管理員，直接允許登入
      if (isAdmin) return true

      // 檢查資料庫中的用戶
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } })

      // 首次登入或用戶不存在，允許通過（會在 jwt callback 建立用戶）
      // 然後重定向到待審核頁面
      if (!dbUser) {
        return '/auth/pending'
      }

      // 用戶已存在，檢查狀態
      if (!dbUser.is_active) {
        return '/auth/error?reason=deactivated'
      }

      if ((dbUser as any).role === (Role as any).PENDING) {
        return '/auth/pending'
      }

      return true
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

