import type { Metadata } from "next";
import { EmotionRegistry } from "@/components/ui/emotion-registry";
import { Provider } from "@/components/ui/provider";
import { TRPCReactProvider } from "@/trpc/client";

export const metadata: Metadata = {
  title: "Task manager",
  description: "A simple task manager",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <EmotionRegistry>
          <Provider>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </Provider>
        </EmotionRegistry>
      </body>
    </html>
  );
}
