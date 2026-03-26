"use client";

import { useState, useEffect } from "react";

interface SetupStepProps {
  onComplete: () => void;
}

export default function SetupStep({ onComplete }: SetupStepProps) {
  const [pageUrl, setPageUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [transcriptsDetected, setTranscriptsDetected] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.confluencePageUrl) setPageUrl(data.confluencePageUrl);
        if (data.confluenceEmail) setEmail(data.confluenceEmail);
        if (data.confluenceApiToken) setApiToken(data.confluenceApiToken);
        setTranscriptsDetected(data.hasTranscriptsPath);
      })
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confluencePageUrl: pageUrl,
          confluenceEmail: email,
          confluenceApiToken: apiToken,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        onComplete();
      } else {
        setErrors(data.errors || { general: "Something went wrong" });
      }
    } catch {
      setErrors({ general: "Could not connect. Check your network." });
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Connect to Confluence
        </h2>
        <p className="text-slate-500">
          Paste the link to the Confluence page where you want your design
          documentation published. We&apos;ll handle the rest.
        </p>
      </div>

      {transcriptsDetected && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Cursor chats detected
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              We found your Cursor conversation history automatically. No setup needed for this part.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Confluence Page URL
          </label>
          <input
            type="url"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://your-company.atlassian.net/wiki/spaces/TEAM/pages/123456/My+Page"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            required
          />
          {errors.confluencePageUrl && (
            <p className="mt-1.5 text-sm text-rose-500">{errors.confluencePageUrl}</p>
          )}
          <p className="mt-1.5 text-xs text-slate-400">
            Open the target page in Confluence and copy the URL from your browser&apos;s address bar.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Confluence Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            required
          />
          <p className="mt-1.5 text-xs text-slate-400">
            The email address you use to log into Confluence / Atlassian.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            API Token
            <button
              type="button"
              onClick={() => setShowTokenHelp(!showTokenHelp)}
              className="ml-2 text-indigo-500 hover:text-indigo-700 text-xs font-normal underline"
            >
              How do I get this?
            </button>
          </label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Your Atlassian API token"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            required
          />
          {errors.confluenceApiToken && (
            <p className="mt-1.5 text-sm text-rose-500">{errors.confluenceApiToken}</p>
          )}

          {showTokenHelp && (
            <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 p-4 text-sm text-slate-700">
              <p className="font-semibold text-indigo-800 mb-2">
                Getting your API Token (takes 1 minute):
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>
                  Go to{" "}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline hover:text-indigo-800"
                  >
                    id.atlassian.com/manage-profile/security/api-tokens
                  </a>
                </li>
                <li>Click <strong>&quot;Create API token&quot;</strong></li>
                <li>Give it a name like <strong>&quot;Design Documenter&quot;</strong></li>
                <li>Click <strong>Create</strong> and copy the token</li>
                <li>Paste it in the field above</li>
              </ol>
              <p className="mt-2 text-xs text-slate-500">
                Your token is stored locally on this computer and is never sent anywhere except Confluence.
              </p>
            </div>
          )}
        </div>

        {errors.general && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
            {errors.general}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Verifying connection
            </>
          ) : (
            "Connect & Continue"
          )}
        </button>
      </form>
    </div>
  );
}
