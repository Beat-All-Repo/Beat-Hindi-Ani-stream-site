import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export default function VerificationGate({ children }: Props) {
  try {
    const stored = localStorage.getItem("beat-verified");
    if (!stored) return <Navigate to="/verify" replace />;
    const data = JSON.parse(stored);
    if (!data.verified) return <Navigate to="/verify" replace />;
    return <>{children}</>;
  } catch {
    return <Navigate to="/verify" replace />;
  }
}
