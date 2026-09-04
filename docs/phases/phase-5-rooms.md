# Phase 5 — Rooms & Global Dashboard

**Goal**: Let an authenticated user create rooms, join rooms via invite code, switch between rooms, and land on a meaningful global dashboard that shows all their rooms.

---

## Deliverables

- [ ] `POST /api/rooms` — create room (caller becomes owner, first settlement period auto-opened)
- [ ] `POST /api/rooms/join` — join via invite code
- [ ] `GET /api/rooms` — list caller's rooms
- [ ] `GET /api/rooms/:roomId` — room detail
- [ ] `GET /api/rooms/:roomId/members` — list members
- [ ] `CurrentRoomProvider` + `useCurrentRoom()` hook
- [ ] Global dashboard (`app/(app)/dashboard/page.tsx`) — room cards + create/join UI
- [ ] Room switcher in navigation
- [ ] Room shell layout (`app/(app)/rooms/[roomId]/layout.tsx`)

---

## Tasks

### 5.1 Room Service Layer (`lib/services/rooms.ts`)

```ts
export async function createRoom(userId: string, name: string): Promise<Room>
export async function joinRoom(userId: string, inviteCode: string): Promise<Room>
export async function listUserRooms(userId: string): Promise<Room[]>
export async function getRoomDetail(roomId: string, userId: string): Promise<Room>
export async function getRoomMembers(roomId: string, userId: string): Promise<Member[]>
```

**`createRoom` logic**:
1. Generate 8-character invite code (uppercase alphanumeric, excluding `0/O/1/I`) — retry on collision.
2. Insert into `rooms`.
3. Insert caller into `room_members` with `role = 'owner'`.
4. Auto-create first `settlement_periods` row: `status='open'`, `start_date=today`, `end_date=last day of next month`.
5. All three inserts in a single transaction (or sequential with rollback on failure).

**`joinRoom` logic**:
1. Validate invite code format (8-char regex — reject early before DB query).
2. Look up room by `invite_code`.
3. If room not found → `{ success: false, error: 'Invalid invite code' }`.
4. If caller already a member → `{ success: false, error: 'Already a member of this room' }`.
5. Insert into `room_members` with `role = 'member'`.

> ⚠️ Rate limiting on this endpoint is added in Phase 8.

**Room membership check helper** (used by all room-scoped service functions):
```ts
async function assertRoomMember(roomId: string, userId: string): Promise<void>
// Throws if not a member — call at the top of every room-scoped function
```

---

### 5.2 API Route Handlers

| Method | Route | Handler file |
|--------|-------|-------------|
| POST | `/api/rooms` | `app/api/rooms/route.ts` |
| POST | `/api/rooms/join` | `app/api/rooms/join/route.ts` |
| GET | `/api/rooms` | `app/api/rooms/route.ts` |
| GET | `/api/rooms/[roomId]` | `app/api/rooms/[roomId]/route.ts` |
| GET | `/api/rooms/[roomId]/members` | `app/api/rooms/[roomId]/members/route.ts` |

Each handler:
1. Gets session from server Supabase client → `401` if absent.
2. Validates input with Zod.
3. Calls the corresponding service function.
4. Returns `ok(data)` or `err(message, status)` from `lib/apiHelpers.ts`.

**Zod schemas**:
```ts
// POST /api/rooms
z.object({ name: z.string().min(1).max(100) })

// POST /api/rooms/join
z.object({ inviteCode: inviteCodeSchema })  // reuse from lib/validations.ts
```

---

### 5.3 `CurrentRoomProvider` (Section 4g of spec)

`components/rooms/CurrentRoomProvider.tsx`:

```tsx
// Wraps app/(app)/rooms/[roomId]/layout.tsx
// Reads roomId from URL params and exposes it via React context

const CurrentRoomContext = createContext<{ roomId: string } | null>(null);

export function useCurrentRoom() {
  const ctx = useContext(CurrentRoomContext);
  if (!ctx) throw new Error('useCurrentRoom must be used inside CurrentRoomProvider');
  return ctx;
}
```

- Nested components read `roomId` via `useCurrentRoom()` — never from URL or props drilling.
- The room detail query is also exposed here via `useQuery` so all room-scoped pages share the same cached room data.

---

### 5.4 Global Dashboard (`app/(app)/dashboard/page.tsx`)

Layout:
- **Header**: App name, user avatar/name, logout button.
- **Room cards grid**: one card per room the user belongs to, showing room name, member count, and a "Go to room" button.
- **Create Room** button → opens a shadcn `Dialog` with a name input.
- **Join Room** button → opens a shadcn `Dialog` with an invite code input.
- **Empty state**: if user has no rooms, show a centered illustration + "Create your first room or join one with an invite code."

Data fetching:
```ts
const { data: rooms } = useQuery({
  queryKey: ['rooms'],
  queryFn: () => apiClient.get(api.room.list),
});
```

Loading: show `Skeleton` cards while loading.

---

### 5.5 Room Switcher (Navigation)

- Visible on all `app/(app)/rooms/[roomId]/**` pages.
- Shows the current room name with a dropdown to switch to any other room the user belongs to.
- Switching navigates to the new room's bills page: `router.push(`/rooms/${newRoomId}/bills`)`.
- Uses `useCurrentRoom()` for the current room, and a separate `useQuery(['rooms'])` for the full list.

---

### 5.6 Room Shell Layout (`app/(app)/rooms/[roomId]/layout.tsx`)

```tsx
// Server component — validates roomId is accessible by the session user
// Wraps children with <CurrentRoomProvider roomId={roomId}>
// Renders the room-scoped navigation tabs:
//   Bills | Expenses | Products (owner only) | Settlement
```

Tab visibility:
- **Products** tab is only visible to users with `role = 'owner'` in the current room.
- All other tabs visible to all members.

---

## UI Details

### Create Room Dialog
- Single `Input` for room name.
- On success: toast "Room created!", close dialog, navigate to the new room's bills page.
- Show the generated invite code prominently after creation (one-tap copy button).

### Join Room Dialog
- Single `Input` for invite code (auto-uppercased as user types).
- Format hint: "8-character code, e.g. ABCD1234".
- On success: toast "Joined!", close dialog, navigate to the joined room's bills page.
- On invalid code: show inline field error, not just a toast.

### Room Card
```
┌─────────────────────────────┐
│  Room Name                  │
│  3 members · Created Jun 24 │
│                 [Go to room] │
└─────────────────────────────┘
```

---

## Definition of Done

- Logged-in user can create a room and immediately see it on the dashboard.
- Generated invite code is displayed and copyable.
- A second user (second browser/incognito) can join via the invite code.
- Both users see each other in the room members list.
- Room switcher shows all rooms and navigating between them works.
- Attempting to join the same room twice shows an appropriate error.
- Entering an invalid invite code format is rejected before hitting the database.

---

## Branch

`feature/rooms-dashboard`
