import {
  authErrorResponse,
  getCurrentIdentity,
  noStore,
} from "@/server/auth";
import { guardAuthRequest } from "@/server/auth/request-guard";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    guardAuthRequest(request, "getMe");
    const identity = await getCurrentIdentity(request);
    return noStore(Response.json({ user: identity.user }));
  } catch (error) {
    return authErrorResponse(error);
  }
}
