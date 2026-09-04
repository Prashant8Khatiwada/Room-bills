export const api = {
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  user: {
    profile: '/api/user/profile',
    personalExpenses: '/api/user/personal-expenses',
  },
  room: {
    create: '/api/rooms',
    join: '/api/rooms/join',
    list: '/api/rooms',
    detail: (roomId: string) => `/api/rooms/${roomId}`,
    members: (roomId: string) => `/api/rooms/${roomId}/members`,
    updateMember: (roomId: string, memberId: string) => `/api/rooms/${roomId}/members/${memberId}`,
    removeMember: (roomId: string, memberId: string) => `/api/rooms/${roomId}/members/${memberId}`,
    dashboard: (roomId: string) => `/api/rooms/${roomId}/dashboard`,
    settings: (roomId: string) => `/api/rooms/${roomId}/settings`,
    regenerateInvite: (roomId: string) => `/api/rooms/${roomId}/regenerate-invite`,
    allocateBalance: (roomId: string) => `/api/rooms/${roomId}/allocate`,
  },
  bill: {
    list: (roomId: string) => `/api/rooms/${roomId}/bills`,
    create: (roomId: string) => `/api/rooms/${roomId}/bills`,
    templates: (roomId: string) => `/api/rooms/${roomId}/bill-templates`,
  },
  settlement: {
    current: (roomId: string) => `/api/rooms/${roomId}/settlement`,
    close: (roomId: string) => `/api/rooms/${roomId}/settlement/close`,
    history: (roomId: string) => `/api/rooms/${roomId}/settlement/history`,
  },
  admin: {
    users: '/api/admin/users',
    rooms: '/api/admin/rooms',
    stats: '/api/admin/stats',
  },
} as const;
