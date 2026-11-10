import * as chatService from "../services/chat.service.js";
import { emitToUsers } from "../socket/emitter.js";

const cursorOf = (req) => (req.query.cursor ? String(req.query.cursor) : undefined);

// GET /api/conversations
export async function list(req, res) {
  res.json({ conversations: await chatService.listConversations(req.user.id) });
}

// POST /api/conversations  { username }
export async function start(req, res) {
  res.json({ conversation: await chatService.getOrCreateConversation(req.user.id, req.body.username) });
}

// GET /api/conversations/unread-count
export async function unreadCount(req, res) {
  res.json({ unreadCount: await chatService.unreadTotal(req.user.id) });
}

// GET /api/conversations/:id
export async function getOne(req, res) {
  res.json({ conversation: await chatService.getConversation(req.params.id, req.user.id) });
}

// GET /api/conversations/:id/messages?cursor=...
export async function messages(req, res) {
  res.json(await chatService.listMessages(req.params.id, req.user.id, cursorOf(req)));
}

// POST /api/conversations/:id/messages  { text }
// The app normally sends over Socket.io; this REST route does the same job (handy for testing / fallback).
export async function send(req, res) {
  const { message, participants } = await chatService.sendMessage(req.params.id, req.user.id, req.body.text);
  emitToUsers(participants, "message:new", { message });
  res.status(201).json({ message });
}

// POST /api/conversations/:id/read
export async function read(req, res) {
  const { updated, participants } = await chatService.markRead(req.params.id, req.user.id);
  emitToUsers(participants, "messages:read", { conversationId: req.params.id, userId: req.user.id });
  res.json({ updated });
}
