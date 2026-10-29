import { authorizeRequest } from "@/server/auth";
import { handleCatalogApi, listCurrencies } from "@/server/modules/catalog";
import { jsonResponse } from "@/server/shared/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleCatalogApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const result = await listCurrencies(identity);
    return jsonResponse(result, { requestId });
  });
}
