// Fingerprint / face / device-PIN sign-in (WebAuthn passkeys) — browser side.
import API from "../api";
import { startRegistration, startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";

/** true when this browser + device can use fingerprint / face / screen-lock sign-in */
export async function passkeysAvailable() {
  try {
    if (!browserSupportsWebAuthn()) return false;
    return await platformAuthenticatorIsAvailable();
  } catch { return false; }
}

const friendly = (err) => {
  if (err?.name === "NotAllowedError") return "Cancelled, or the fingerprint / face check didn't complete.";
  if (err?.name === "InvalidStateError") return "This device is already set up for your account.";
  return err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";
};

/** Signed-in user: register this device. Throws Error(message) on failure. */
export async function registerThisDevice(label) {
  try {
    const { data } = await API.post("/auth/passkey/register/options");
    const response = await startRegistration({ optionsJSON: data.options });
    const res = await API.post("/auth/passkey/register/verify", { response, challengeToken: data.challengeToken, label });
    return res.data;
  } catch (err) { throw new Error(friendly(err)); }
}

/** Login page: returns { token, user } like the password login. Throws Error(message). */
export async function signInWithPasskey() {
  try {
    const { data } = await API.post("/auth/passkey/login/options");
    const response = await startAuthentication({ optionsJSON: data.options });
    const res = await API.post("/auth/passkey/login/verify", { response, challengeToken: data.challengeToken });
    return res.data;
  } catch (err) { throw new Error(friendly(err)); }
}
