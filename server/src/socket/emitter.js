// A tiny bridge so services can push real-time events without importing Socket.io themselves.
//   emitToUsers([bobId], "notification:new", data)
//
// Every connected socket joins a room called "user:<id>" (see socket/index.js).
// A user can have several tabs/devices open; each one is a socket in the same room,
// so emitting to the room reaches all of them.
let io = null;

export function setIO(instance) {
  io = instance;
}

export function emitToUsers(userIds, event, data) {
  if (!io || userIds.length === 0) return; // e.g. in scripts/tests without a socket server
  // Chaining .to() targets several rooms in ONE emit. Socket.io de-duplicates,
  // so a socket in two of these rooms still gets the event only once.
  let target = io;
  for (const id of new Set(userIds)) target = target.to(`user:${id}`);
  target.emit(event, data);
}
