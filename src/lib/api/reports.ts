export type ReportStatus = "OPEN" | "RESOLVED";

export interface UserReport {
  id: string;
  reporter: string;
  reportedItem: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
}

const STORAGE_KEY = "wale_admin_reports";

const defaultReports: UserReport[] = [
  {
    id: "rep-001",
    reporter: "Tunde Olowo (Student)",
    reportedItem: "Modern self-contained studio at Tanke",
    reason: "Incorrect pricing / misleading information",
    details: "Landlord claims price is ₦850k on the site, but requested ₦950k in person during inspection.",
    status: "OPEN",
    createdAt: "2026-08-22T10:00:00Z",
  },
  {
    id: "rep-002",
    reporter: "Amina Bello (Student)",
    reportedItem: "Shared 2-bedroom flat near UI Second Gate",
    reason: "Fake agent / listing",
    details: "This property is already occupied. The uploader is not the owner or legal representative.",
    status: "OPEN",
    createdAt: "2026-08-23T14:20:00Z",
  },
];

function readReports(): UserReport[] {
  if (typeof window === "undefined") return defaultReports;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultReports));
    return defaultReports;
  }

  const reports: unknown = JSON.parse(saved);
  if (!Array.isArray(reports)) {
    throw new Error("Saved report data is not a list.");
  }
  return reports as UserReport[];
}

function saveReports(reports: UserReport[]) {
  if (typeof window === "undefined") {
    throw new Error("Cannot update reports on the server.");
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export const reportsApi = {
  async listReports(): Promise<UserReport[]> {
    return readReports();
  },

  async updateStatus(id: string, status: ReportStatus): Promise<UserReport> {
    const reports = readReports();
    const report = reports.find((item) => item.id === id);
    if (!report) throw new Error("Report not found.");

    const updated = { ...report, status };
    saveReports(reports.map((item) => (item.id === id ? updated : item)));
    return updated;
  },

  async deleteReport(id: string): Promise<void> {
    const reports = readReports();
    if (!reports.some((item) => item.id === id)) throw new Error("Report not found.");
    saveReports(reports.filter((item) => item.id !== id));
  },
};
