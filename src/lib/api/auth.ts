import { loginSchema, type LoginData } from "./schemas";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "student" | "landlord" | "lawyer" | "tenant" | "admin";
  university?: string;
  createdAt: string;
};

export const DEFAULT_USERS = [
  {
    id: "usr_abdul",
    fullName: "Abdurrahman Suleiman",
    name: "Abdurrahman Suleiman",
    email: "abdul@example.com",
    role: "student",
    password: "Password123",
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
    password: "Password123",
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
    password: "Password123",
    phone: "08011112222",
    createdAt: "2026-08-10T12:00:00.000Z",
  },
  {
    id: "usr_okonlawyer",
    fullName: "Barrister Okon",
    name: "Barrister Okon",
    email: "okonlawyer@yahoo.com",
    role: "lawyer",
    password: "Password123",
    phone: "08022223333",
    createdAt: "2026-08-12T14:30:00.000Z",
  },
  {
    id: "usr_chiomatenant",
    fullName: "Chioma Nwachukwu",
    name: "Chioma Nwachukwu",
    email: "chiomatenant@gmail.com",
    role: "tenant",
    password: "Password123",
    phone: "08033334444",
    createdAt: "2026-08-14T09:15:00.000Z",
  },
  {
    id: "usr_aminastudent",
    fullName: "Amina Bello",
    name: "Amina Bello",
    email: "aminastudent@unilorin.edu.ng",
    role: "student",
    password: "Password123",
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
    password: "Password123",
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
    password: "Password123",
    phone: "08099999999",
    createdAt: "2026-08-01T08:00:00.000Z",
  },
];

export const authApi = {
  /**
   * Log in a user with email and password.
   */
  async login(payload: LoginData): Promise<{ message: string; user: AuthUser; token: string }> {
    const validated = loginSchema.parse(payload);

    // Mock network delay:
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get registered users from localStorage or initialize with DEFAULT_USERS
    let users: any[] = [];
    if (typeof window !== "undefined") {
      const storedUsers = localStorage.getItem("wale_mock_registered_users");
      if (storedUsers) {
        try {
          users = JSON.parse(storedUsers);
        } catch (e) {
          users = DEFAULT_USERS;
          localStorage.setItem("wale_mock_registered_users", JSON.stringify(DEFAULT_USERS));
        }
      } else {
        users = DEFAULT_USERS;
        localStorage.setItem("wale_mock_registered_users", JSON.stringify(DEFAULT_USERS));
      }
    } else {
      users = DEFAULT_USERS;
    }

    const found = users.find((u: any) => u.email.toLowerCase() === validated.email.toLowerCase());
    if (!found) {
      throw new Error("Account not found. Please create an account before logging in.");
    }

    if (found.password !== validated.password) {
      throw new Error("Invalid email or password.");
    }

    const authUser: AuthUser = {
      id: found.id,
      fullName: found.fullName || found.name,
      email: found.email,
      phone: found.phone,
      role: found.role,
      university: found.university,
      createdAt: found.createdAt || new Date().toISOString(),
    };

    return {
      message: "Welcome back!",
      user: authUser,
      token: "mock_jwt_token_header_payload_signature",
    };
  },

  /**
   * Register a new user account.
   */
  async signUp(payload: any): Promise<{ message: string; user: AuthUser; token: string }> {
    // Mock network delay:
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let users: any[] = [];
    if (typeof window !== "undefined") {
      const storedUsers = localStorage.getItem("wale_mock_registered_users");
      if (storedUsers) {
        try {
          users = JSON.parse(storedUsers);
        } catch (e) {
          users = DEFAULT_USERS;
        }
      } else {
        users = DEFAULT_USERS;
      }
    } else {
      users = DEFAULT_USERS;
    }

    const emailExists = users.some((u: any) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (emailExists) {
      throw new Error("This email is already in use. Please use a different email address.");
    }

    const newUser = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      fullName: payload.name,
      name: payload.name, // Keep for fallback compatibility
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role: payload.role || "student",
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      users.push(newUser);
      localStorage.setItem("wale_mock_registered_users", JSON.stringify(users));
    }

    const authUser: AuthUser = {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    return {
      message: "Account created successfully!",
      user: authUser,
      token: "mock_jwt_token_header_payload_signature",
    };
  },
};
