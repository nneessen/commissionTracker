import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { TrainingUserCertification } from "../../types/training-module.types";

interface CertificationCardProps {
  userCert: TrainingUserCertification;
}

export function CertificationCard({ userCert }: CertificationCardProps) {
  const cert = userCert.certification;
  const isExpiringSoon =
    userCert.expires_at &&
    new Date(userCert.expires_at).getTime() - Date.now() <
      30 * 24 * 60 * 60 * 1000;

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
        userCert.status === "active"
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10"
          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 opacity-60"
      }`}
    >
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center ${
          userCert.status === "active"
            ? "bg-emerald-100 dark:bg-emerald-900/30"
            : "bg-zinc-200 dark:bg-zinc-800"
        }`}
      >
        <ShieldCheck
          className={`h-4 w-4 ${
            userCert.status === "active" ? "text-emerald-600" : "text-zinc-400"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
          {cert?.name}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>
            Earned {new Date(userCert.earned_at).toLocaleDateString()}
          </span>
          {userCert.expires_at && (
            <span
              className={`flex items-center gap-0.5 ${isExpiringSoon ? "text-amber-500" : ""}`}
            >
              {isExpiringSoon && <AlertTriangle className="h-2.5 w-2.5" />}
              Expires {new Date(userCert.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          userCert.status === "active"
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
        }`}
      >
        {userCert.status}
      </span>
    </div>
  );
}
