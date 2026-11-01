export interface PayoutRow {
  id: string;
  user_id: string;
  amount_kobo: string | number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "paid" | "rejected";
  transfer_reference: string | null;
  admin_note: string | null;
  created_at: string | Date;
  processed_at: string | Date | null;
  user_name?: string;
  user_email?: string;
}

export function toPayout(row: PayoutRow, withUser = false) {
  return {
    id: row.id,
    amountKobo: Number(row.amount_kobo),
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    status: row.status,
    transferReference: row.transfer_reference,
    adminNote: row.admin_note,
    createdAt: new Date(row.created_at).toISOString(),
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
    ...(withUser && row.user_name
      ? { user: { id: row.user_id, name: row.user_name, email: row.user_email ?? "" } }
      : {}),
  };
}
