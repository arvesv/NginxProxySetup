import ora, { type Ora } from "ora";

export async function withSpinner<T>(
  text: string,
  task: (spinner: Ora) => Promise<T>,
  successText?: string
): Promise<T> {
  const spinner = ora(text).start();
  try {
    const result = await task(spinner);
    spinner.succeed(successText || text);
    return result;
  } catch (error: any) {
    const msg = error?.response?.data?.error?.message || error?.message || "Failed";
    spinner.fail(`${text} (${msg})`);
    throw error;
  }
}
