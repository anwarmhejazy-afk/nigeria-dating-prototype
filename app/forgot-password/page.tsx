import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="Reset your password" description="Enter your email and we will send a secure password-reset link."><AuthForm mode="forgot" /></AuthShell>;
}
