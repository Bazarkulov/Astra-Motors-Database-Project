import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Motors and Heritage home">
        <span className="wordmark-mark">M<span>&</span>H</span>
        <span className="wordmark-name">MOTORS <i>&</i> HERITAGE</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/inventory">Inventory</Link>
        <Link href="/about">Our standard</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <Link className="header-cta" href="/inventory">Explore the collection <ArrowUpRight size={15} /></Link>
      <details className="mobile-nav">
        <summary aria-label="Open navigation"><Menu size={21} /></summary>
        <nav aria-label="Mobile navigation"><Link href="/inventory">Inventory</Link><Link href="/about">Our standard</Link><Link href="/contact">Contact</Link></nav>
      </details>
    </header>
  );
}
