import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-ink text-white/60 px-4 md:px-8 py-8 md:py-10 text-sm">
      <div className="grid md:grid-cols-4 gap-8 md:gap-6 max-w-7xl mx-auto">
        <div>
          <div className="font-display font-700 text-lg text-white">
            ArTa<span className="text-gold-400">Zone</span>
          </div>
          <p className="mt-2 text-xs">Platform top-up digital terpercaya.</p>
        </div>
        <div>
          <p className="font-display font-700 text-white mb-3 text-xs tracking-widest">PRODUK</p>
          <Link to="/categories" className="block text-xs hover:text-white mb-2 transition-colors">Kategori Produk</Link>
          <Link to="/promo" className="block text-xs hover:text-white mb-2 transition-colors">Promo & Diskon</Link>
          <Link to="/promo" className="block text-xs hover:text-white transition-colors">Redeem Voucher</Link>
        </div>
        <div>
          <p className="font-display font-700 text-white mb-3 text-xs tracking-widest">BANTUAN</p>
          <Link to="/help" className="block text-xs hover:text-white mb-2 transition-colors">Pusat Bantuan (FAQ)</Link>
          <Link to="/tickets" className="block text-xs hover:text-white mb-2 transition-colors">Tiket Komplain</Link>
          <Link to="/help" className="block text-xs hover:text-white transition-colors">Hubungi CS</Link>
        </div>
        <div>
          <p className="font-display font-700 text-white mb-3 text-xs tracking-widest">LEGAL</p>
          <Link to="/terms" className="block text-xs hover:text-white mb-2 transition-colors">Syarat & Ketentuan</Link>
          <Link to="/privacy" className="block text-xs hover:text-white transition-colors">Kebijakan Privasi</Link>
        </div>
      </div>
    </footer>
  );
}