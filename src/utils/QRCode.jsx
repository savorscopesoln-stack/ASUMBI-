// Safe wrapper around react-qr-code.
// The package is CommonJS; in a Vite production build the default import can
// resolve to the whole module object ({ default, QRCode }) instead of the
// component, which crashes React with minified error #130 ("got: object").
// This picks the real component whichever shape the bundler hands us.
import * as mod from "react-qr-code";

const isComponent = (c) =>
  typeof c === "function" || (c && typeof c === "object" && "$$typeof" in c);

const candidates = [
  mod.QRCode,
  mod.default?.QRCode,
  mod.default?.default,
  mod.default,
  mod,
];

const QRCode = candidates.find(isComponent);

export default QRCode;
