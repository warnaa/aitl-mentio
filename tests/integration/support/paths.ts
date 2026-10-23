export const REPO_ROOT = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
/** Server log and failure screenshots; uploaded by CI. */
export const ARTIFACTS_DIR = `${REPO_ROOT}/tests/integration/.artifacts`;
