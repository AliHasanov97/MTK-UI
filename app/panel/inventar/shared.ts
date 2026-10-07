import { ApiError } from "../../lib/api/client";

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Bu əməliyyat üçün icazəniz yoxdur.";
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

const quantityFormatter = new Intl.NumberFormat("az-AZ", { maximumFractionDigits: 2 });
export const formatQuantity = (n: number) => quantityFormatter.format(n);

const moneyFormatter = new Intl.NumberFormat("az-AZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatMoney = (n: number) => `${moneyFormatter.format(n)} ₼`;
