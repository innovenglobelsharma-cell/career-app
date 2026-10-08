export type UserRole = "job_seeker" | "recruiter" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  city: string | null;
  createdAt: string;
};

export type SendLoginOtpInput = {
  email: string;
  password: string;
  phoneNumber: string;
};

export type VerifyLoginOtpInput = {
  email: string;
  password: string;
  phoneNumber: string;
  otp: string;
};

export type SendLoginOtpResponse = {
  phoneNumber: string;
};

export type LoginResponse = {
  user: AuthUser;
};

export type LogoutResponse = {
  user?: AuthUser;
};
