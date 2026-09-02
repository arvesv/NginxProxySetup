export interface ProfileConfig {
  url?: string;
  token?: string;
  tokenExpires?: string;
  email?: string;
  password?: string;
}

export interface CliConfigStore {
  activeProfile: string;
  profiles: Record<string, ProfileConfig>;
}
