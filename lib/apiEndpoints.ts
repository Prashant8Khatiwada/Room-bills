export const api = {
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  room: {
    create: '/api/rooms',
    join: '/api/rooms/join',
    list: '/api/rooms',
    detail: (roomId: string) => `/api/rooms/${roomId}`,
    members: (roomId: string) => `/api/rooms/${roomId}/members`,
    dashboard: (roomId: string) => `/api/rooms/${roomId}/dashboard`,
  },
  bill: {
    list: (roomId: string) => `/api/rooms/${roomId}/bills`,
    create: (roomId: string) => `/api/rooms/${roomId}/bills`,
    templates: (roomId: string) => `/api/rooms/${roomId}/bill-templates`,
  },
  settlement: {
    current: (roomId: string) => `/api/rooms/${roomId}/settlement`,
    close: (roomId: string) => `/api/rooms/${roomId}/settlement/close`,
  },
  admin: {
    users: '/api/admin/users',
    rooms: '/api/admin/rooms',
    stats: '/api/admin/stats',
  },
} as const;
