import { SimulatorProvider } from "@/components/emo/SimulatorProvider";
import { AppShell } from "@/components/emo/AppShell";

export default function HomePage() {
  return (
    <SimulatorProvider>
      <AppShell />
    </SimulatorProvider>
  );
}
