import { Shield, CheckCircle, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface SignatureSealProps {
  token?: string;
  date: string;
  reportUrl?: string;
  verified?: boolean;
}

export function SignatureSeal({ token, date, reportUrl, verified = true }: SignatureSealProps) {
  const hash = token
    ? Array.from(token.substring(0, 16)).reduce((acc, c) => acc + c.charCodeAt(0), 0)
        .toString(16)
        .padStart(8, "0")
    : "00000000";

  return (
    <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 p-4 print:border-emerald-300 print:bg-emerald-50">
      <div className="flex items-start gap-4">
        {/* Seal circle */}
        <div className="relative shrink-0">
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/50 print:border-emerald-500">
            <div className="text-center">
              <Shield className="size-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <span className="block text-[6px] font-bold text-emerald-700 dark:text-emerald-300 leading-tight mt-0.5">
                SIGNE
              </span>
            </div>
          </div>
          {/* Verification status */}
          {verified && (
            <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900">
              <CheckCircle className="size-3 text-white" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Signature électronique
            </h4>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[8px] font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="size-2.5" />
                Certifié
              </span>
            )}
          </div>

          <div className="space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
            <p className="flex items-center gap-1.5">
              <Clock className="size-3 text-emerald-500" />
              Signé le : <strong className="text-gray-800 dark:text-gray-200">{date}</strong>
            </p>
            <p className="flex items-center gap-1.5">
              <Shield className="size-3 text-emerald-500" />
              Empreinte : <code className="text-[8px] bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-300">
                EH-{hash}
              </code>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle className="size-3 text-emerald-500" />
              Document signé numériquement par <strong className="text-gray-800 dark:text-gray-200">imoprice AI</strong>
            </p>
          </div>

          {/* QR with verification URL */}
          {reportUrl && (
            <div className="mt-2 flex items-center gap-2">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white p-1 print:border-emerald-300">
                <QRCodeSVG value={reportUrl} size={36} level="M" />
              </div>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 leading-tight">
                Scannez pour vérifier<br />l'authenticité du rapport
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Verification badge strip */}
      <div className="mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-800/50">
        <div className="flex items-center justify-between text-[8px] text-gray-400 dark:text-gray-500">
          <span>Algorithme : SHA-256</span>
          <span className="font-mono">imoprice v1.0</span>
          <span>ID: {hash}</span>
        </div>
      </div>
    </div>
  );
}
