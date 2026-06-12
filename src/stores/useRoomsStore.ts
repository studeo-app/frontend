import { create } from "zustand";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import type { Room, RoomMember } from "@/types/room";

const MEMBERS_COLLECTION = "members";

interface UserProfileSnapshot {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
}

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  membersByRoomId: Record<string, RoomMember[]>;
  membersLoading: boolean;
  membersError: string | null;
  subscribeRooms: (uid: string) => Unsubscribe;
  subscribeRoomsMembers: (rooms: Room[]) => Unsubscribe;
  addRoomLocally: (room: Room) => void;
  updateRoomLocally: (room: Room) => void;
  removeRoomLocally: (roomId: string) => void;
  removeRoomMembersLocally: (roomId: string) => void;
}

const docToRoom = (snapshot: QueryDocumentSnapshot<DocumentData>): Room => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    roomCode: String(data.roomCode ?? ""),
    name: String(data.name ?? ""),
    ownerUid: String(data.ownerUid ?? ""),
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
  };
};

const sortRooms = (rooms: Room[]): Room[] =>
  [...rooms].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

const getDisplayName = (uid: string, profile?: UserProfileSnapshot): string => {
  if (!profile) return uid;

  return (
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
    profile.username ||
    profile.email ||
    uid
  );
};

export const useRoomsStore = create<RoomsState>((set) => ({
  rooms: [],
  loading: false,
  error: null,
  membersByRoomId: {},
  membersLoading: false,
  membersError: null,
  subscribeRooms: (uid) => {
    set({ loading: true, error: null });

    const ownedRoomsQuery = query(collection(db, "rooms"), where("ownerUid", "==", uid));
    const allRoomsQuery = collection(db, "rooms");

    const ownedRooms = new Map<string, Room>();
    const memberRooms = new Map<string, Room>();
    const membershipUnsubscribers = new Map<string, Unsubscribe>();
    let ownedLoaded = false;
    let allRoomsLoaded = false;
    let disposed = false;

    const publishRooms = () => {
      if (disposed) return;

      set({
        rooms: sortRooms(
          Array.from(new Map([...ownedRooms, ...memberRooms]).values()),
        ),
        loading: !(ownedLoaded && allRoomsLoaded),
        error: null,
      });
    };

    const syncMembershipListeners = (rooms: Room[]) => {
      const nextRoomIds = new Set(rooms.map((room) => room.id));

      membershipUnsubscribers.forEach((unsubscribe, roomId) => {
        if (!nextRoomIds.has(roomId)) {
          unsubscribe();
          membershipUnsubscribers.delete(roomId);
          memberRooms.delete(roomId);
        }
      });

      rooms.forEach((room) => {
        if (room.ownerUid === uid) {
          memberRooms.delete(room.id);
          return;
        }

        if (membershipUnsubscribers.has(room.id)) return;

        const unsubscribe = onSnapshot(
          doc(db, "rooms", room.id, MEMBERS_COLLECTION, uid),
          (memberSnapshot) => {
            if (disposed) return;

            if (memberSnapshot.exists()) {
              memberRooms.set(room.id, room);
            } else {
              memberRooms.delete(room.id);
            }

            publishRooms();
          },
          (err) => {
            if (!disposed) {
              set({
                error: err.message ?? "Error al obtener las salas",
                loading: false,
              });
            }
          },
        );

        membershipUnsubscribers.set(room.id, unsubscribe);
      });
    };

    const unsubscribeOwnedRooms = onSnapshot(
      ownedRoomsQuery,
      (snapshot) => {
        ownedRooms.clear();
        snapshot.docs.forEach((roomDoc) => {
          ownedRooms.set(roomDoc.id, docToRoom(roomDoc));
        });
        ownedLoaded = true;
        publishRooms();
      },
      (err) => {
        if (!disposed) {
          set({
            error: err.message ?? "Error al obtener las salas",
            loading: false,
          });
        }
      },
    );

    const unsubscribeAllRooms = onSnapshot(
      allRoomsQuery,
      (snapshot) => {
        const rooms = snapshot.docs.map(docToRoom);
        allRoomsLoaded = true;
        syncMembershipListeners(rooms);
        publishRooms();
      },
      (err) => {
        if (!disposed) {
          set({
            error: err.message ?? "Error al obtener las salas",
            loading: false,
          });
        }
      },
    );

    return () => {
      disposed = true;
      unsubscribeOwnedRooms();
      unsubscribeAllRooms();
      membershipUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  },
  subscribeRoomsMembers: (rooms) => {
    if (rooms.length === 0) {
      set({ membersByRoomId: {}, membersLoading: false, membersError: null });
      return () => undefined;
    }

    set({ membersLoading: true, membersError: null });

    const roomMemberDocs = new Map<string, Map<string, RoomMember>>();
    const userProfiles = new Map<string, UserProfileSnapshot>();
    const roomUnsubscribers = new Map<string, Unsubscribe>();
    const userUnsubscribers = new Map<string, Unsubscribe>();
    let disposed = false;

    const publishMembers = () => {
      if (disposed) return;

      const nextMembers = Object.fromEntries(
        rooms.map((room) => {
          const memberMap = roomMemberDocs.get(room.id) ?? new Map<string, RoomMember>();
          const ownerProfile = userProfiles.get(room.ownerUid);
          const owner: RoomMember = {
            id: room.ownerUid,
            roomId: room.id,
            uid: room.ownerUid,
            joinedAt: room.createdAt,
            displayName: getDisplayName(room.ownerUid, ownerProfile),
            email: ownerProfile?.email,
            username: ownerProfile?.username,
            avatarUrl: ownerProfile?.avatarUrl,
          };

          const members = Array.from(memberMap.values())
            .filter((member) => member.uid !== room.ownerUid)
            .map((member) => {
              const profile = userProfiles.get(member.uid);
              return {
                ...member,
                displayName: getDisplayName(member.uid, profile),
                email: profile?.email,
                username: profile?.username,
                avatarUrl: profile?.avatarUrl,
              };
            })
            .sort(
              (a, b) =>
                new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
            );

          return [room.id, [owner, ...members]];
        }),
      );

      set({
        membersByRoomId: nextMembers,
        membersLoading: false,
        membersError: null,
      });
    };

    const ensureUserListener = (uid: string) => {
      if (userUnsubscribers.has(uid)) return;

      const unsubscribe = onSnapshot(
        doc(db, "users", uid),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            userProfiles.set(uid, {
              firstName: String(data.firstName ?? ""),
              lastName: String(data.lastName ?? ""),
              email: data.email ? String(data.email) : undefined,
              username: data.username ? String(data.username) : undefined,
              avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
            });
          } else {
            userProfiles.delete(uid);
          }

          publishMembers();
        },
        (err) => {
          if (!disposed) {
            set({
              membersError: err.message ?? "No pudimos cargar los miembros de las salas.",
              membersLoading: false,
            });
          }
        },
      );

      userUnsubscribers.set(uid, unsubscribe);
    };

    rooms.forEach((room) => {
      ensureUserListener(room.ownerUid);

      const unsubscribe = onSnapshot(
        collection(db, "rooms", room.id, MEMBERS_COLLECTION),
        (snapshot) => {
          const memberMap = new Map<string, RoomMember>();

          snapshot.docs.forEach((memberDoc) => {
            const data = memberDoc.data();
            const uid = memberDoc.id;
            ensureUserListener(uid);
            memberMap.set(uid, {
              id: memberDoc.id,
              roomId: room.id,
              uid,
              joinedAt: String(data.joinedAt ?? ""),
              displayName: uid,
            });
          });

          roomMemberDocs.set(room.id, memberMap);
          publishMembers();
        },
        (err) => {
          if (!disposed) {
            set({
              membersError: err.message ?? "No pudimos cargar los miembros de las salas.",
              membersLoading: false,
            });
          }
        },
      );

      roomUnsubscribers.set(room.id, unsubscribe);
    });

    publishMembers();

    return () => {
      disposed = true;
      roomUnsubscribers.forEach((unsubscribe) => unsubscribe());
      userUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  },
  addRoomLocally: (room) => {
    set((state) => ({
      rooms: sortRooms([room, ...state.rooms.filter((r) => r.id !== room.id)]),
    }));
  },
  updateRoomLocally: (room) => {
    set((state) => ({
      rooms: sortRooms(state.rooms.map((r) => (r.id === room.id ? room : r))),
    }));
  },
  removeRoomLocally: (roomId) => {
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
    }));
  },
  removeRoomMembersLocally: (roomId) => {
    set((state) => {
      const nextMembers = { ...state.membersByRoomId };
      delete nextMembers[roomId];
      return { membersByRoomId: nextMembers };
    });
  },
}));
