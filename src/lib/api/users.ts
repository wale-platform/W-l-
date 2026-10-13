import { z } from "zod";

// Schema for student profile validation
export const studentProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number"),
  university: z.string().min(1, "Please select your university"),
  faculty: z.string().min(1, "Faculty is required"),
  department: z.string().min(1, "Department is required"),
  level: z.string().min(1, "Level is required"),
  studentId: z.string().min(1, "Student ID / Matric Number is required"),
  preferredBudget: z.number().min(0, "Budget must be a positive number"),
  preferredLocation: z.string().min(1, "Preferred location is required"),
});

export type StudentProfile = z.infer<typeof studentProfileSchema>;

const LOCAL_STORAGE_KEY = "wale_student_profile";

const defaultProfile: StudentProfile = {
  name: "Amina Bello",
  email: "amina@example.com",
  phone: "08012345678",
  university: "unilorin",
  faculty: "Science",
  department: "Computer Sciences",
  level: "400",
  studentId: "180805001",
  preferredBudget: 600000,
  preferredLocation: "Tanke / Fate",
};

export const usersApi = {
  /**
   * Get the current student profile.
   */
  async getProfile(): Promise<StudentProfile> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay
    
    if (typeof window === "undefined") return defaultProfile;

    // Retrieve currently logged-in user from localStorage
    const userStr = localStorage.getItem("wale_user");
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (!user) {
      return defaultProfile;
    }

    const userProfileKey = `${LOCAL_STORAGE_KEY}_${user.email}`;
    const data = localStorage.getItem(userProfileKey);
    if (!data) {
      // Create a default profile seeded with the logged-in user's data
      const userDefaultProfile: StudentProfile = {
        name: user.fullName || user.name || "Student",
        email: user.email,
        phone: user.phone || "08012345678",
        university: user.university || "unilorin",
        faculty: "Science",
        department: "Computer Sciences",
        level: "400",
        studentId: "180805001",
        preferredBudget: 600000,
        preferredLocation: "Tanke / Fate",
      };
      localStorage.setItem(userProfileKey, JSON.stringify(userDefaultProfile));
      return userDefaultProfile;
    }

    try {
      return JSON.parse(data) as StudentProfile;
    } catch {
      return defaultProfile;
    }
  },

  /**
   * Update the student profile.
   */
  async updateProfile(payload: StudentProfile): Promise<{ message: string; profile: StudentProfile }> {
    const validated = studentProfileSchema.parse(payload);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("wale_user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userProfileKey = user ? `${LOCAL_STORAGE_KEY}_${user.email}` : LOCAL_STORAGE_KEY;
      localStorage.setItem(userProfileKey, JSON.stringify(validated));
    }

    return {
      message: "Profile updated successfully!",
      profile: validated,
    };
  },
};
