// 使用者角色枚舉
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INVESTOR = 'INVESTOR',
  EMPLOYEE = 'EMPLOYEE'
}

// 使用者介面
export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: Role
  investorId?: string
  isActive: boolean
  preferences?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// NextAuth擴展
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: Role
      investorId?: string
    }
  }

  interface User {
    id: string
    role: Role
    investorId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    investorId?: string
  }
}

// 權限上下文
export interface PermissionContext {
  userId: string
  role: Role
  investorId?: string
}

// API回應格式
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    total?: number
    page?: number
    limit?: number
    timestamp: string
  }
}