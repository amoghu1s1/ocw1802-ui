import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ThemeProvider } from "@/lib/theme-context";
import SidebarShell from "@/components/SidebarShell";
import "./globals.css";

/* Signature display face, self-hosted (Fontshare Sentient). Body stays system-ui, data uses system mono. */
const sentient = localFont({
  src: [
    { path: "./fonts/sentient-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/sentient-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/sentient-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/sentient-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-sentient",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "18.02SC Multivariable Calculus · MIT OCW",
    template: "%s · 18.02SC",
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
    'var T={"Default Dark":["#0a0a0a","#141414","#1c1c1c","#262626","#ececec","#b8b8b8","#868686"],Dracula:["#282a36","#21222c","#2d2f3d","#44475a","#f8f8f2","#c8ccd8","#8f98b3"],"Atomic Dark":["#1b1d1e","#232526","#2c2d2e","#3c3d3e","#d8dbd9","#aeb3b1","#878d8b"],Nord:["#2e3440","#343b4b","#3b4252","#434c5e","#eceff4","#c3cad6","#8d97a8"],"Tokyo Night":["#1a1b26","#1f2335","#24283b","#292e42","#c8d3f5","#aab9e9","#8590b5"]};' +
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
    <html lang="en" className={`${sentient.variable} h-full antialiased`} suppressHydrationWarning>
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
