import { apiFetch, apiFetchFile, apiUploadFile, saveBlobAsFile } from "./client";

type Envelope<T> = { data: T; message: string };
type MessageOnly = { message: string };

// Exactly one of these should be set — which record (Contract, Vendor, Payment,
// Owner or Transaction — the last covers both expenses and additional income,
// which the backend models as one generic ledger entity) this attachment belongs
// to. Mirrors the backend's FileAttachment FK set for the Payments module.
export type FileAttachmentTarget = {
  contractId?: string;
  vendorId?: string;
  paymentId?: string;
  purchaseId?: string;
  ownerId?: string;
  transactionId?: string;
};

export type FileAttachmentResponse = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  // Only whoever uploaded this document may delete it — computed server-side
  // against the current user, so the frontend never needs its own user id.
  canDelete: boolean;
};

function targetParams(target: FileAttachmentTarget): URLSearchParams {
  const params = new URLSearchParams();
  if (target.contractId) params.set("contractId", target.contractId);
  if (target.vendorId) params.set("vendorId", target.vendorId);
  if (target.paymentId) params.set("paymentId", target.paymentId);
  if (target.purchaseId) params.set("purchaseId", target.purchaseId);
  if (target.ownerId) params.set("ownerId", target.ownerId);
  if (target.transactionId) params.set("transactionId", target.transactionId);
  return params;
}

export function listFileAttachments(accessToken: string, target: FileAttachmentTarget) {
  return apiFetch<Envelope<FileAttachmentResponse[]>>(
    `api/payments/fileattachments/search?${targetParams(target).toString()}`,
    accessToken,
  ).then((e) => e.data);
}

// Used for the "generate PDF → sign & stamp it → scan it back in" workflow: the
// Komendant/Xəzinədar downloads the system-generated document (exportPaymentReceipt /
// exportContract), signs the printed copy, and uploads the scan here against the
// same record — this becomes the attachment list shown next to that record. Also
// used to attach a source document (invoice, proof of payment) at the moment a
// payment/expense/income record is created.
export function uploadFileAttachment(accessToken: string, file: File, target: FileAttachmentTarget) {
  const formData = new FormData();
  formData.append("File", file);
  if (target.contractId) formData.append("ContractId", target.contractId);
  if (target.vendorId) formData.append("VendorId", target.vendorId);
  if (target.paymentId) formData.append("PaymentId", target.paymentId);
  if (target.purchaseId) formData.append("PurchaseId", target.purchaseId);
  if (target.ownerId) formData.append("OwnerId", target.ownerId);
  if (target.transactionId) formData.append("TransactionId", target.transactionId);

  return apiUploadFile<Envelope<string>>("api/payments/fileattachments", accessToken, formData).then((e) => e.data);
}

export async function downloadFileAttachment(accessToken: string, fileAttachmentId: string) {
  const { blob, fileName } = await getFileAttachmentBlob(accessToken, fileAttachmentId);
  saveBlobAsFile(blob, fileName);
}

export function getFileAttachmentBlob(accessToken: string, fileAttachmentId: string) {
  return apiFetchFile(
    `api/payments/fileattachments/${fileAttachmentId}/download`,
    accessToken,
  );
}

export function deleteFileAttachment(accessToken: string, fileAttachmentId: string) {
  return apiFetch<MessageOnly>(`api/payments/fileattachments/${fileAttachmentId}`, accessToken, {
    method: "DELETE",
  });
}
