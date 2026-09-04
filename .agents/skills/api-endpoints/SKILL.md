---
name: api-endpoints
description: How every API endpoint is named, defined, and called. Read before adding any new endpoint or calling one from a component.
---

Every API path is defined ONCE in `lib/apiEndpoints.ts` as a nested object, controller-style, mirroring how a Next.js API route handler would be named if it were a class. Never hardcode a path string anywhere else in the codebase.

Example shape (extend this pattern for new domains, don't invent a different shape):

```ts
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
  },
  product: {
    list: (roomId: string) => `/api/rooms/${roomId}/products`,
    create: (roomId: string) => `/api/rooms/${roomId}/products`,
  },
  bill: {
    list: (roomId: string) => `/api/rooms/${roomId}/bills`,
    create: (roomId: string) => `/api/rooms/${roomId}/bills`,
  },
  expense: {
    list: (roomId: string) => `/api/rooms/${roomId}/expenses`,
    create: (roomId: string) => `/api/rooms/${roomId}/expenses`,
    delete: (roomId: string, id: string) => `/api/rooms/${roomId}/expenses/${id}`,
  },
  settlement: {
    current: (roomId: string) => `/api/rooms/${roomId}/settlement`,
    close: (roomId: string) => `/api/rooms/${roomId}/settlement/close`,
  },
  admin: {
    users: '/api/admin/users',
    rooms: '/api/admin/rooms',
  },
} as const;
```

Every client-side data call goes through `lib/apiClient.ts`, e.g. `apiClient.get(api.room.list)` or `apiClient.post(api.expense.create(roomId), body)`. Never call `fetch` directly from a component.
