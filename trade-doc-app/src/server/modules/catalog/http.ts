import { AuthError } from "../../auth";
import { ApiError } from "../../shared/errors";
import { handleApi } from "../../shared/http";

export function handleCatalogApi(
  handler: (requestId: string) => Response | Promise<Response>,
): Promise<Response> {
  return handleApi(async (requestId) => {
    try {
      return await handler(requestId);
    } catch (error) {
      if (error instanceof AuthError) {
        throw new ApiError(error.status, error.code, error.message, {
          fieldErrors: error.fieldErrors,
          ...(error.headers === undefined ? {} : { headers: error.headers }),
        });
      }
      throw error;
    }
  });
}
