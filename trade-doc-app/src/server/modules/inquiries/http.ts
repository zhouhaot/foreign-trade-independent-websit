import { AuthError } from "../../auth/errors";
import {
  ApiError,
  createRequestId,
  errorResponse,
} from "../../shared";

export async function handleInquiryRequest(
  handler: (requestId: string) => Response | Promise<Response>,
): Promise<Response> {
  const requestId = createRequestId();
  try {
    const response = await handler(requestId);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    const apiError =
      error instanceof AuthError
        ? new ApiError(error.status, error.code, error.message, {
            fieldErrors: error.fieldErrors,
            ...(error.headers === undefined ? {} : { headers: error.headers }),
          })
        : error;
    return errorResponse(apiError, requestId);
  }
}
