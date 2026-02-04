import { getEditorConfig } from "@/lib/editor";
import AuthPanel from "@/components/AuthPanel";

export default async function Home() {
  const config = await getEditorConfig();
  return (
    <main className="min-h-screen bg-grid">
      <AuthPanel config={config.landing} />
    </main>
  );
}
