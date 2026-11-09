import Link from "next/link";
import { CurrentYear } from "@/components/layout/current-year";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div><div className="footer-mark">M&H</div><p>A considered collection of classic and performance automobiles.</p></div>
        <div><span className="eyebrow">EXPLORE</span><Link href="/inventory">Current inventory</Link><Link href="/about">Our standard</Link><Link href="/contact">Contact</Link></div>
        <div><span className="eyebrow">VISIT BY APPOINTMENT</span><p>Address details coming soon</p><p>Mon–Sat · By appointment</p></div>
        <div><span className="eyebrow">START A CONVERSATION</span><Link href="/contact">Enquire about a vehicle</Link><Link href="/contact">Consign a vehicle</Link></div>
      </div>
      <div className="footer-bottom"><CurrentYear /><span>Independent by design.</span></div>
    </footer>
  );
}
