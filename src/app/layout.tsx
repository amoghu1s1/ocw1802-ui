import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ThemeProvider } from "@/lib/theme-context";
import SidebarShell from "@/components/SidebarShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "18.02SC Multivariable Calculus · MIT OCW",
    template: "%s — 18.02SC",
  },
  description: "A personal dashboard for MIT OpenCourseWare 18.02SC Multivariable Calculus (Fall 2010, Prof. Denis Auroux).",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "18.02SC Multivariable Calculus",
    description: "Track progress, search transcripts, and study MIT OCW 18.02SC offline.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

function ThemeScript() {
  const code = `(function(){try{var a=localStorage.getItem("ocw1802.theme.accent");var t=localStorage.getItem("ocw1802.theme.bg");var m={"Red":"#C41E24","Blue":"#2563EB","Green":"#16A34A","Purple":"#9333EA","Orange":"#EA580C","Teal":"#0D9488","Pink":"#DB2777","Amber":"#D97706"};var themes={"Default Dark":["#0a0a0a","#141414","#1c1c1c","#262626","#e5e5e5","#a3a3a3","#525252"],"Dracula":["#282a36","#21222c","#2d2f3d","#44475a","#f8f8f2","#bfbfbf","#6272a4"]};if(a&&m[a]){document.documentElement.style.setProperty("--color-accent",m[a]);document.documentElement.style.setProperty("--color-accent-dim",m[a]+"26");}if(t&&themes(t)){var th=themes(t);document.documentElement.style.setProperty("--color-bg",th[0]);document.documentElement.style.setProperty("--color-surface",th[1]);document.documentElement.style.setProperty("--color-surface-2",th[2]);document.documentElement.style.setProperty("--color-border",th[3]);}function themes(n){return {"Default Dark":["#0a0a0a","#141414","#1c1c1c","#262626","#e5e5e5","#a3a3a3","#525252"],"Dracula":["#282a36","#21222c","#2d2f3d","#44475a","#f8f8f2","#bfbfbf","#6272a4"]}[n];}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-bg text-text">
        <ThemeProvider>
          <SidebarProvider>
            <SidebarShell>{children}</SidebarShell>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
