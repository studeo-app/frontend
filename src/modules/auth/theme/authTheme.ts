/**
 * Tema de autenticación — tokens y clases reutilizables.
 *
 * Los valores de color viven en `styles/auth.tokens.css` + `index.css` (@theme).
 * Las clases visuales viven en `styles/auth.components.css`.
 */

/** Referencia documental — los valores reales viven en auth.tokens.css (:root / .dark) */
export const authColors = {
  light: {
    btnBg: "#4D41DF",
    btnText: "#FFFFFF",
    inputBg: "#EFF4FF",
    inputBorder: "#D4DFF0",
    icon: "#464555",
    label: "#464555",
    title: "#0B1C30",
    inputText: "#0B1C30",
    link: "#4D41DF",
    googleBg: "#FFFFFF",
    googleText: "#4D41DF",
    error: "#93000A",
    bg: "#FFFFFF",
    surface: "#FFFFFF",
  },
  dark: {
    btnBg: "#6C63FF",
    btnText: "#2000A4",
    inputBg: "#1A1D27",
    inputBorder: "#2E3147",
    icon: "#DFDFDF",
    label: "#C7C4D8",
    title: "#E4E1EE",
    inputText: "#E4E1EE",
    link: "#41EEC2",
    googleBg: "#FFFFFF",
    googleText: "#2000A4",
    error: "#93000A",
    bg: "#0B0D14",
    surface: "#12151F",
  },
} as const;

const btnPrimaryUtilities =
  "bg-auth-btn text-auth-btn-text hover:brightness-110 active:scale-[0.98]";

const btnGoogleUtilities =
  "bg-auth-google-bg text-auth-google-text border-auth-input-border hover:brightness-95 active:scale-[0.98]";

const linkUtilities =
  "text-auth-link hover:opacity-90 transition-all duration-200";

/** Clases CSS del módulo auth (prefijo `auth-`) */
export const authClasses = {
  page: "auth-page font-auth",
  surface: "auth-surface",
  logo: "auth-logo",
  title: "auth-title",
  subtitle: "auth-subtitle",
  label: "auth-label block px-1",
  labelLogin: "auth-label auth-label--login block",
  input: "auth-input",
  inputRounded: "auth-input rounded-2xl h-10 px-4 text-sm",
  inputRoundedLogin: "auth-input rounded-xl h-12 px-4 text-sm",
  inputError: "auth-input--error",
  errorText: "auth-error-text px-1",
  helpText: "auth-help-text",
  btnPrimary: `auth-btn-primary ${btnPrimaryUtilities}`,
  btnGoogle: `auth-btn-google ${btnGoogleUtilities}`,
  link: `auth-link ${linkUtilities} rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg`,
  dividerLine: "auth-divider-line w-full border-t",
  dividerText: "auth-divider-text px-4 text-xs uppercase tracking-[0.2em]",
  dividerTextSurface:
    "auth-divider-text auth-divider-text--surface px-3 text-xs",
  icon: "auth-icon",
  ruleValid: "auth-rule--valid",
  ruleInvalid: "auth-rule--invalid",
  field: "space-y-2",
  footer: "auth-subtitle text-center text-xs leading-relaxed",
} as const;

/** Combina clases del input auth con estado de error opcional */
export function authInputClass(
  options: {
    invalid?: boolean;
    size?: "register" | "login";
    extra?: string;
  } = {}
): string {
  const { invalid = false, size = "register", extra = "" } = options;
  const sizeClass =
    size === "login"
      ? authClasses.inputRoundedLogin
      : authClasses.inputRounded;

  return [sizeClass, invalid ? authClasses.inputError : "", extra]
    .filter(Boolean)
    .join(" ");
}
