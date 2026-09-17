import { Amplify } from "aws-amplify";

function getEnv(viteKey: string, nextKey: string, fallback: string): string {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const v = (import.meta.env as Record<string, string | undefined>)[viteKey] ||
                (import.meta.env as Record<string, string | undefined>)[nextKey];
      if (v) return v;
    }
  } catch {}

  try {
    if (typeof process !== "undefined" && process.env) {
      const p = process.env[viteKey] || process.env[nextKey];
      if (p) return p;
    }
  } catch {}

  return fallback;
}

const userPoolId = getEnv(
  "VITE_AWS_USER_POOLS_ID",
  "NEXT_PUBLIC_AWS_USER_POOLS_ID",
  "ap-south-1_O2viAa5cM"
);

const userPoolClientId = getEnv(
  "VITE_AWS_USER_POOLS_WEB_CLIENT_ID",
  "NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID",
  "4t46u2ot1h9b9d5no9qsnt2fgj"
);

let isConfigured = false;

export function initAmplify() {
  if (isConfigured) return;

  try {
    if (userPoolId && userPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId,
          },
        },
      });
      isConfigured = true;
      console.log("✅ AWS Amplify configured successfully with Cognito User Pool");
    }
  } catch (err) {
    console.warn("Amplify configuration initialization warning:", err);
  }
}

// Auto-initialize on module load
initAmplify();
