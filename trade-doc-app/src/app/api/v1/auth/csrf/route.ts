import { authErrorResponse, issueCsrf } from "@/server/auth";
import { guardAuthRequest } from "@/server/auth/request-guard";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    guardAuthRequest(request, "getCsrf");
    const result = await issueCsrf(request);
    const headers = new Headers({ "Cache-Control": "no-store" });
    if (result.setCookie) {
      headers.set("Set-Cookie", result.setCookie);
    }
    return Response.json({ token: result.token }, { headers });
  } catch (error) {
    return authErrorResponse(error);
  }
}
