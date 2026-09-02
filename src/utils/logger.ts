import chalk from "chalk";

export const logger = {
  info: (msg: string) => console.log(chalk.blue("ℹ ") + msg),
  success: (msg: string) => console.log(chalk.green("✔ ") + msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠ ") + msg),
  error: (msg: string, err?: any) => {
    console.error(chalk.red("✖ ") + chalk.bold(msg));
    if (err) {
      if (err.response?.data?.error?.message) {
        console.error(chalk.red(`  Reason: ${err.response.data.error.message}`));
      } else if (err.message) {
        console.error(chalk.red(`  Reason: ${err.message}`));
      }
    }
  },
  title: (msg: string) => console.log("\n" + chalk.bold.cyan(msg)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  raw: (msg: string) => console.log(msg),
};
