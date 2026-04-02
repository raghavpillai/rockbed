import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RegionProvider } from "@/lib/region-context";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Rockbed | Bedrock Provisioner",
  description: "Provision and manage AWS Bedrock API keys",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased min-h-screen">
        <RegionProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </RegionProvider>
      </body>
    </html>
  );
}
