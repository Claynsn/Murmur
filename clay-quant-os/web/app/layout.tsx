import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clay Quant OS",
  description:
    "Turn a fuzzy strategy idea into a backtested prediction-market strategy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
