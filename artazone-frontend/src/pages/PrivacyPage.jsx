import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />

      <div className="px-8 py-12 bg-gradient-to-b from-violet-50 to-white border-b-2 border-ink/5">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-700 text-4xl mb-3 text-center">Kebijakan Privasi</h1>
          <p className="text-sm text-ink/60 text-center">Pembaruan Terakhir: 28 Juli 2026</p>
        </div>
      </div>

      <div className="px-8 py-10 max-w-4xl mx-auto w-full flex-1">
        <div className="card p-8 bg-white space-y-6 text-sm text-ink/80">
          <p>
            Privasi Anda sangat penting bagi kami. Kebijakan Privasi ini menjelaskan bagaimana ArTa Zone mengumpulkan, menggunakan, membagikan, dan melindungi informasi pribadi Anda saat menggunakan layanan kami.
          </p>

          <div>
            <h2 className="font-display font-700 text-lg mb-2 text-ink">1. Informasi yang Kami Kumpulkan</h2>
            <p className="mb-2">Saat Anda menggunakan layanan ArTa Zone, kami dapat mengumpulkan informasi berikut:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Informasi Transaksi:</strong> ID Game, Nomor HP (untuk tujuan top-up), dan alamat email (untuk pengiriman bukti struk digital).</li>
              <li><strong>Informasi Akun (opsional):</strong> Nama, Email, dan kata sandi yang dienkripsi (jika Anda mendaftar sebagai member).</li>
              <li><strong>Data Teknis:</strong> Alamat IP, jenis peramban, dan aktivitas penggunaan situs untuk keperluan analitik.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-700 text-lg mb-2 text-ink">2. Penggunaan Informasi</h2>
            <p className="mb-2">Data yang dikumpulkan akan digunakan semata-mata untuk:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Memproses pesanan dan meneruskan informasi ke pihak penyedia produk (Digiflazz/Publisher Game) untuk pengisian item.</li>
              <li>Memberikan notifikasi terkait status pembayaran dari pihak payment gateway (Midtrans).</li>
              <li>Menyelesaikan komplain atau sengketa transaksi melalui layanan Tiket Bantuan kami.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-700 text-lg mb-2 text-ink">3. Pembagian Data ke Pihak Ketiga</h2>
            <p>
              ArTa Zone <strong>tidak akan menjual, menyewakan, atau mendistribusikan</strong> data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran. Data Anda hanya diteruskan secara aman ke mitra resmi kami (seperti Midtrans untuk pemrosesan dana dan Digiflazz untuk pemrosesan stok) sejauh yang diperlukan untuk menyelesaikan transaksi Anda.
            </p>
          </div>

          <div>
            <h2 className="font-display font-700 text-lg mb-2 text-ink">4. Keamanan Data</h2>
            <p>
              Kami menerapkan langkah-langkah keamanan fisik, elektronik, dan administratif yang ketat (termasuk teknologi enkripsi standar industri) untuk melindungi informasi Anda dari akses yang tidak sah, pengubahan, atau penghancuran.
            </p>
          </div>

          <p className="pt-4 border-t-2 border-ink/10 text-xs italic">
            Jika Anda memiliki pertanyaan lebih lanjut mengenai Kebijakan Privasi ini, jangan ragu untuk menghubungi kami melalui kontak yang tersedia.
          </p>

          <div className="mt-10 pt-8 border-t-2 border-ink/10">
            <h2 className="font-display font-700 text-lg mb-4 text-ink text-center">Hubungi Tim Keamanan Kami</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <a href="https://wa.me/6285333572747" target="_blank" rel="noreferrer" className="card-sm p-4 flex items-center gap-4 hover:-translate-y-1 transition cursor-pointer bg-white group border border-ink/10">
                <div className="w-10 h-10 rounded-lg bg-green-100 border border-green-300 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.493l-1.076-.014a11.393 11.393 0 01-5.118-1.258l-.364-.216-3.81.998 1.022-3.715-.237-.376a11.383 11.383 0 01-1.748-6.101C.704 5.253 5.166.792 10.963.792c2.81 0 5.452 1.094 7.438 3.08a10.5 10.5 0 013.08 7.438c0 5.803-4.464 10.183-9.45 10.183zm-6.241-3.666c1.378.816 2.946 1.25 4.567 1.25 4.881 0 8.855-3.834 8.855-8.835 0-2.36-.919-4.577-2.588-6.246A8.853 8.853 0 0010.962 1.387C6.082 1.387 2.108 5.221 2.108 10.222c0 1.636.439 3.224 1.272 4.619l-.611 2.222 2.277-.597zm9.646-3.874c-.167-.083-1.002-.494-1.157-.55-.155-.056-.268-.084-.38.083-.112.167-.436.55-.536.662-.1.111-.202.125-.369.042-.167-.083-.715-.264-1.361-.84-.502-.447-.841-.999-.94-1.166-.098-.167-.011-.257.073-.34.075-.074.167-.195.25-.292.083-.097.112-.167.167-.278.056-.111.028-.208-.014-.291-.042-.083-.38-.917-.52-1.256-.136-.33-.274-.285-.38-.29-.098-.005-.211-.005-.323-.005s-.295.042-.45.208c-.155.167-.591.577-.591 1.408 0 .831.605 1.634.689 1.745.083.111 1.192 1.82 2.886 2.551.403.174.718.278.964.356.405.129.774.11 1.065.067.325-.049 1.002-.41 1.143-.806.141-.396.141-.735.099-.806-.042-.07-.155-.111-.323-.195z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-sm">WhatsApp</p>
                  <p className="text-[11px] text-ink/60">Respons cepat</p>
                </div>
              </a>

              <a href="https://t.me/kaanss21" target="_blank" rel="noreferrer" className="card-sm p-4 flex items-center gap-4 hover:-translate-y-1 transition cursor-pointer bg-white group border border-ink/10">
                <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.07-.05-.17-.02-.25 0-.11.03-1.78 1.14-5.06 3.34-.48.33-.92.49-1.3.48-.43-.01-1.24-.24-1.84-.44-.73-.24-1.31-.37-1.26-.78.03-.22.33-.44.92-.68 3.63-1.58 6.06-2.63 7.3-3.14 3.47-1.44 4.19-1.69 4.66-1.7.11 0 .35.03.5.15.13.1.17.24.18.35-.01.07-.01.21-.02.32z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-sm">Telegram</p>
                  <p className="text-[11px] text-ink/60">Grup komunitas</p>
                </div>
              </a>

              <a href="mailto:lalunaufalarkan21@gmail.com" className="card-sm p-4 flex items-center gap-4 hover:-translate-y-1 transition cursor-pointer bg-white group border border-ink/10">
                <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center text-red-600 group-hover:bg-red-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                  <p className="font-bold text-sm">Email Support</p>
                  <p className="text-[11px] text-ink/60">Kendala data</p>
                </div>
              </a>
            </div>
          </div>
          
        </div>
      </div>

      <Footer />
    </div>
  );
}