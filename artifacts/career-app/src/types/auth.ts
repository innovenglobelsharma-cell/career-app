export type UserRole = "job_seeker" | "recruiter" | "admin" | "support";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  city: string | null;
  createdAt: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: AuthUser;
};

export type LogoutResponse = {
  user?: AuthUser;
};
