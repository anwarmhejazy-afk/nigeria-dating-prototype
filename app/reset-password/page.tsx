import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return <AuthShell eyebrow="Secure update" title="Choose a new password" description="Use a strong password that you do not use on another website."><ResetPasswordForm /></AuthShell>;
}
