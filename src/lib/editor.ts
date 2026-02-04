import fs from "fs/promises";
import path from "path";

export type EditorConfig = {
  landing: {
    companyName: string;
    logoSize: number;
    showLogin: boolean;
    showSignup: boolean;
    sectionsOrder: Array<"logo" | "login" | "signup">;
    layout: "two-column" | "stack";
  };
  client: {
    title: string;
    subtitle: string;
    showQa: boolean;
    showPreview: boolean;
    sectionsOrder: Array<"header" | "uploads">;
  };
  admin: {
    title: string;
    subtitle: string;
    showQa: boolean;
    showPreview: boolean;
    sectionsOrder: Array<"header" | "clients">;
  };
};

const defaultConfig: EditorConfig = {
  landing: {
    companyName: "Prestige Accounting",
    logoSize: 160,
    showLogin: true,
    showSignup: true,
    sectionsOrder: ["logo", "login", "signup"],
    layout: "two-column",
  },
  client: {
    title: "Client Portal",
    subtitle: "Upload statements and track conversions.",
    showQa: true,
    showPreview: true,
    sectionsOrder: ["header", "uploads"],
  },
  admin: {
    title: "Admin overview",
    subtitle: "Review clients and convert statements.",
    showQa: true,
    showPreview: true,
    sectionsOrder: ["header", "clients"],
  },
};

const editorPath = path.join(process.cwd(), "data", "editor.json");

export async function getEditorConfig(): Promise<EditorConfig> {
  try {
    const content = await fs.readFile(editorPath, "utf-8");
    return JSON.parse(content) as EditorConfig;
  } catch (error) {
    return defaultConfig;
  }
}

export async function saveEditorConfig(config: EditorConfig) {
  await fs.writeFile(editorPath, JSON.stringify(config, null, 2));
}

export function getDefaultEditorConfig() {
  return defaultConfig;
}
