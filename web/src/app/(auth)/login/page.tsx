import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold text-kse-navy">Welcome back</h2>
      <p className="mt-1 text-sm text-kse-muted">Sign in to continue the course.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-kse-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-kse-navy hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
