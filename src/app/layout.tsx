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
  const code =
    "(function(){try{" +
    'var A={Red:"#C41E24",Blue:"#2563EB",Green:"#16A34A",Purple:"#9333EA",Orange:"#EA580C",Teal:"#0D9488",Pink:"#DB2777",Amber:"#D97706"};' +
    'var T={"Default Dark":["#0a0a0a","#141414","#1c1c1c","#262626","#e5e5e5","#a3a3a3","#525252"],Dracula:["#282a36","#21222c","#2d2f3d","#44475a","#f8f8f2","#bfbfbf","#6272a4"],"Atomic Dark":["#1b1d1e","#232526","#2c2d2e","#3c3d3e","#c5c8c6","#9da0a0","#505354"],Nord:["#2e3440","#2e3440","#3b4252","#434c5e","#eceff4","#d8dee9","#4c566a"],"Tokyo Night":["#1a1b26","#1f2335","#24283b","#292e42","#c0caf5","#9aa5ce","#565f89"]};' +
    "var s=document.documentElement.style;" +
    "function rgb(h){return parseInt(h.slice(1,3),16)+' '+parseInt(h.slice(3,5),16)+' '+parseInt(h.slice(5,7),16);}" +
    'var a=localStorage.getItem("ocw1802.theme.accent");' +
    'if(a&&A[a]){s.setProperty("--color-accent",A[a]);s.setProperty("--color-accent-dim",A[a]+"26");s.setProperty("--accent-rgb",rgb(A[a]));}' +
    'var t=T[localStorage.getItem("ocw1802.theme.bg")];' +
    'if(t){s.setProperty("--color-bg",t[0]);s.setProperty("--color-surface",t[1]);s.setProperty("--color-surface-2",t[2]);s.setProperty("--color-border",t[3]);s.setProperty("--color-text",t[4]);s.setProperty("--color-text-dim",t[5]);s.setProperty("--color-text-faint",t[6]);}' +
    "}catch(e){}})();";
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
