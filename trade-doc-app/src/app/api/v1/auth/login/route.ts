import {
  authErrorResponse,
  login,
  noStore,
  parseLoginRequest,
} from "@/server/auth";
import { guardAuthRequest } from "@/server/auth/request-guard";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    guardAuthRequest(request, "login");
    const input = await parseLoginRequest(request);
    const result = await login(request, input);
    return noStore(
      Response.json(
        { user: result.user },
        { headers: { "Set-Cookie": result.setCookie } },
      ),
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
