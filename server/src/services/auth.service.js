// Services hold the business logic and talk to the database.
// They know nothing about req/res, so they're easy to reuse and test.
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { httpError } from "../utils/httpError.js";

// The fields that are safe to send to the browser. The password hash is never included.
export const publicUserFields = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
};

export async function register({ name, username, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const details = {};
    if (existing.email === email) details.email = "This email is already registered";
    if (existing.username === username) details.username = "This username is taken";
    throw httpError(409, "Account already exists", details);
  }

  // Hash = one-way scramble. 12 "salt rounds" makes guessing slow for attackers.
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: { name, username, email, password: passwordHash },
    select: publicUserFields,
  });
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same message for "no such email" and "wrong password",
  // so attackers can't find out which emails have accounts.
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw httpError(401, "Invalid email or password");

  const { password: _hash, ...publicUser } = user;
  return publicUser;
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserFields });
  if (!user) throw httpError(401, "Account not found, please log in again");
  return user;
}
