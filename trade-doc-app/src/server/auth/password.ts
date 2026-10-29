import argon2 from "argon2";

import { createOpaqueToken } from "./tokens";

let dummyHashPromise: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  encodedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(encodedHash, password);
  } catch {
    return false;
  }
}

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(createOpaqueToken());
  return dummyHashPromise;
}

export async function verifyLoginPassword(
  encodedHash: string | null,
  password: string,
): Promise<boolean> {
  const candidateHash = encodedHash ?? (await getDummyHash());
  return verifyPassword(candidateHash, password);
}
