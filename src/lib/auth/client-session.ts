import { DEFAULT_USERS, type AuthUser } from "@/lib/api/auth";

interface StoredUser {
  id?: string;
  name?: string;
  fullName?: string;
  email: string;
  role?: string;
  createdAt?: string;
  authProvider?: string;
}

function readRegisteredUsers(): StoredUser[] {
  const saved = localStorage.getItem("wale_mock_registered_users");
  if (!saved) return [...DEFAULT_USERS];

  const users: unknown = JSON.parse(saved);
  if (
    !Array.isArray(users) ||
    users.some(
      (user) =>
        typeof user !== "object" ||
        user === null ||
        !("email" in user) ||
        typeof user.email !== "string",
    )
  ) {
    throw new Error("Saved account data is invalid. Clear the damaged account data and try again.");
  }
  return users as StoredUser[];
}

export function startGoogleSession(user: AuthUser): string {
  const registeredUsers = readRegisteredUsers();
  const existingUser = registeredUsers.some(
    (registeredUser) => registeredUser.email.toLowerCase() === user.email.toLowerCase(),
  );

  if (!existingUser) {
    registeredUsers.push({
      id: user.id,
      fullName: user.fullName,
      name: user.fullName,
      email: user.email,
      role: "student",
      createdAt: user.createdAt,
      authProvider: "google",
    });
    localStorage.setItem("wale_mock_registered_users", JSON.stringify(registeredUsers));
  }

  localStorage.setItem("wale_user", JSON.stringify(user));
  localStorage.setItem("wale_role", user.role);
  localStorage.setItem("wale_is_logged_in", "true");

  if (user.role === "landlord") return "/landlord";
  if (user.role === "lawyer") return "/lawyer";
  if (user.role === "tenant") return "/tenant";
  return "/student";
}
