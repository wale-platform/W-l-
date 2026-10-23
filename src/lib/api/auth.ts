import { loginSchema, type LoginData, type SignUpFormData } from "./schemas";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "student" | "landlord" | "lawyer" | "tenant" | "admin";
  university?: string;
  createdAt: string;
};

interface StoredAuthUser {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  role: AuthUser["role"];
  password?: string;
  phone?: string;
  university?: string;
  createdAt?: string;
  authProvider?: "google";
}

export const DEFAULT_USERS: StoredAuthUser[] = [
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

function isAuthRole(role: unknown): role is AuthUser["role"] {
  return (
    role === "student" ||
    role === "landlord" ||
    role === "lawyer" ||
    role === "tenant" ||
    role === "admin"
  );
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "fullName" in value &&
    typeof value.fullName === "string" &&
    "role" in value &&
    isAuthRole(value.role) &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    (!("phone" in value) || typeof value.phone === "string") &&
    (!("university" in value) || typeof value.university === "string")
  );
}

function isStoredAuthUser(value: unknown): value is StoredAuthUser {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "role" in value &&
    isAuthRole(value.role) &&
    (!("fullName" in value) || typeof value.fullName === "string") &&
    (!("name" in value) || typeof value.name === "string") &&
    (!("password" in value) || typeof value.password === "string") &&
    (!("phone" in value) || typeof value.phone === "string") &&
    (!("university" in value) || typeof value.university === "string") &&
    (!("createdAt" in value) || typeof value.createdAt === "string")
  );
}

function getStoredUsers(): StoredAuthUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;

  const storedUsers = localStorage.getItem("wale_mock_registered_users");
  if (!storedUsers) {
    localStorage.setItem("wale_mock_registered_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  const users: unknown = JSON.parse(storedUsers);
  if (!Array.isArray(users) || !users.every(isStoredAuthUser)) {
    throw new Error("Saved account data is invalid. Clear the damaged account data and try again.");
  }
  return users;
}

export const authApi = {
  /**
   * Log in a user with email and password.
   */
  async login(payload: LoginData): Promise<{ message: string; user: AuthUser; token: string }> {
    const validated = loginSchema.parse(payload);

    // Mock network delay:
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const users = getStoredUsers();

    const found = users.find((user) => user.email.toLowerCase() === validated.email.toLowerCase());
    if (!found) {
      throw new Error("Account not found. Please create an account before logging in.");
    }

    if (!found.password) {
      throw new Error("This account uses Google sign-in. Continue with Google to log in.");
    }
    if (found.password !== validated.password) {
      throw new Error("Invalid email or password.");
    }

    const authUser: AuthUser = {
      id: found.id,
      fullName: found.fullName || found.name || found.email,
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

  async loginWithGoogle(
    credential: string,
    accountRole: "student" | "landlord" | "lawyer" | "tenant" = "student",
  ): Promise<{ message: string; user: AuthUser }> {
    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, role: accountRole }),
    });

    const result: unknown = await response.json();
    if (!response.ok) {
      const message =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : "Google sign-in could not be completed.";
      throw new Error(message);
    }

    if (
      typeof result !== "object" ||
      result === null ||
      !("user" in result) ||
      !isAuthUser(result.user)
    ) {
      throw new Error("Google sign-in returned an invalid account response.");
    }

    return {
      message:
        "message" in result && typeof result.message === "string"
          ? result.message
          : "Signed in with Google.",
      user: result.user,
    };
  },

  /**
   * Register a new user account.
   */
  async signUp(payload: SignUpFormData): Promise<{ message: string; user: AuthUser; token: string }> {
    // Mock network delay:
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const users = getStoredUsers();

    const emailExists = users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase());
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
