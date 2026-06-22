import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold text-kse-navy">Create your account</h2>
      <p className="mt-1 text-sm text-kse-muted">Join the Disruption cohort.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-kse-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-kse-navy hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
