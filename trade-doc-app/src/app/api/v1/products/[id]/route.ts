import { authorizeRequest } from "@/server/auth";
import {
  getProduct,
  handleCatalogApi,
  parseProductUpdateRequest,
  updateProduct,
} from "@/server/modules/catalog";
import {
  createRequestFingerprint,
  jsonResponse,
  parseIdempotencyKey,
  parseResourceId,
} from "@/server/shared";

export const runtime = "nodejs";

type ProductRouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: Request,
  context: ProductRouteContext,
): Promise<Response> {
  return handleCatalogApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const { id } = await context.params;
    const result = await getProduct(identity, parseResourceId(id));
    return jsonResponse(result, { requestId });
  });
}

export async function PUT(
  request: Request,
  context: ProductRouteContext,
): Promise<Response> {
  return handleCatalogApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales"],
      csrf: true,
    });
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const [{ id }, input] = await Promise.all([
      context.params,
      parseProductUpdateRequest(request),
    ]);
    const productId = parseResourceId(id);
    const url = new URL(request.url);
    const requestHash = createRequestFingerprint({
      operationId: "updateProduct",
      method: request.method,
      path: url.pathname,
      query: url.searchParams,
      body: input,
      decimalPaths: ["/refPrice"],
    });
    const result = await updateProduct(identity, productId, input, {
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
