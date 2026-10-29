export {
  inquiryCreateSchema,
  inquiryItemInputSchema,
  type InquiryCreateInput,
} from "./dto";
export { handleInquiryRequest } from "./http";
export {
  createInquiry,
  getInquiry,
  listInquiries,
  type CreateInquiryResult,
  type InquiryDto,
  type InquiryItemDto,
} from "./service";
