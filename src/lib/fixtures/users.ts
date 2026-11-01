/**
 * Sample accounts shown by the admin dashboard mock pages. These are not
 * real accounts and cannot be used to log in — authentication is backed by
 * the `users` table in Neon.
 */
export interface SampleUser {
  id: string;
  fullName: string;
  name: string;
  email: string;
  role: "student" | "landlord" | "lawyer" | "tenant" | "admin";
  phone?: string;
  university?: string;
  createdAt: string;
}

export const DEFAULT_USERS: SampleUser[] = [
  {
    id: "usr_abdul",
    fullName: "Abdurrahman Suleiman",
    name: "Abdurrahman Suleiman",
    email: "abdul@example.com",
    role: "student",
    phone: "08012345678",
    university: "unilorin",
    createdAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "usr_amina",
    fullName: "Amina Bello",
    name: "Amina Bello",
    email: "amina@example.com",
    role: "student",
    phone: "08012345678",
    university: "unilorin",
    createdAt: "2026-08-20T11:00:00.000Z",
  },
  {
    id: "usr_kolalandlord",
    fullName: "Alhaji Kolawole",
    name: "Alhaji Kolawole",
    email: "kolalandlord@gmail.com",
    role: "landlord",
    phone: "08011112222",
    createdAt: "2026-08-10T12:00:00.000Z",
  },
  {
    id: "usr_okonlawyer",
    fullName: "Barrister Okon",
    name: "Barrister Okon",
    email: "okonlawyer@yahoo.com",
    role: "lawyer",
    phone: "08022223333",
    createdAt: "2026-08-12T14:30:00.000Z",
  },
  {
    id: "usr_chiomatenant",
    fullName: "Chioma Nwachukwu",
    name: "Chioma Nwachukwu",
    email: "chiomatenant@gmail.com",
    role: "tenant",
    phone: "08033334444",
    createdAt: "2026-08-14T09:15:00.000Z",
  },
  {
    id: "usr_aminastudent",
    fullName: "Amina Bello",
    name: "Amina Bello",
    email: "aminastudent@unilorin.edu.ng",
    role: "student",
    phone: "08012345678",
    university: "unilorin",
    createdAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "usr_tundestudent",
    fullName: "Tunde Olowo",
    name: "Tunde Olowo",
    email: "tundestudent@unilorin.edu.ng",
    role: "student",
    phone: "08055556666",
    university: "unilorin",
    createdAt: "2026-08-20T11:45:00.000Z",
  },
  {
    id: "usr_admin",
    fullName: "Admin User",
    name: "Admin User",
    email: "admin@wale.ng",
    role: "admin",
    phone: "08099999999",
    createdAt: "2026-08-01T08:00:00.000Z",
  },
];
