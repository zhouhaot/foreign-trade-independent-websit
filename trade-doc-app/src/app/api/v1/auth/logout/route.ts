import { authErrorResponse, logout } from "@/server/auth";
import { guardAuthRequest } from "@/server/auth/request-guard";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    guardAuthRequest(request, "logout");
    const setCookie = await logout(request);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store", "Set-Cookie": setCookie },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
