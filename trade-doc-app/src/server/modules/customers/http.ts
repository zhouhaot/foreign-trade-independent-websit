import { AuthError } from "../../auth/errors";
import { ApiError, handleApi } from "../../shared";

export function handleCustomerApi(
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
