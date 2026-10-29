import { z } from "zod";

import { strictDto } from "../../shared";

const requiredText = (maximum: number) => z.string().min(1).max(maximum);
const optionalText = (maximum: number) => z.string().max(maximum);
const email = z.union([z.literal(""), z.email().max(254)]);

const customerFields = {
  nameCn: requiredText(200),
  nameEn: requiredText(200),
  country: requiredText(100),
  contact: requiredText(100),
  email,
  phone: optionalText(50),
  address: requiredText(1000),
  remark: optionalText(2000),
};

export const customerCreateSchema = strictDto(customerFields);
export const customerUpdateSchema = strictDto({
  expectedVersion: z.number().int().min(1).max(2_147_483_647),
  ...customerFields,
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
