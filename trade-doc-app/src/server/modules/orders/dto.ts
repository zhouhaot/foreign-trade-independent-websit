import { z } from "zod";

import { strictDto } from "../../shared/dto";

export const orderCreateDto = strictDto({
  expectedVersion: z.number().int().min(1).max(2147483647),
  deliveryDate: z.string().length(10),
});
