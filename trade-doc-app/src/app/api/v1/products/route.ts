import { authorizeRequest } from "@/server/auth";
import {
  createProduct,
  handleCatalogApi,
  listProducts,
  parseProductCreateRequest,
} from "@/server/modules/catalog";
import {
  createRequestFingerprint,
  jsonResponse,
  parseIdempotencyKey,
  parsePagination,
} from "@/server/shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleCatalogApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const pagination = parsePagination(new URL(request.url).searchParams);
    const result = await listProducts(identity, pagination);
    return jsonResponse(result, { requestId });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleCatalogApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales"],
      csrf: true,
    });
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const input = await parseProductCreateRequest(request);
    const url = new URL(request.url);
    const requestHash = createRequestFingerprint({
      operationId: "createProduct",
      method: request.method,
      path: url.pathname,
      query: url.searchParams,
      body: input,
      decimalPaths: ["/refPrice"],
    });
    const result = await createProduct(identity, input, {
      idempotencyKey,
      requestHash,
      requestId,
    });
    return jsonResponse(result.result, {
      status: result.responseStatus,
      requestId,
      replayed: result.replayed,
    });
  });
}
