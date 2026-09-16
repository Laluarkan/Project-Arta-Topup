/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';
import SimpleLineChart from '../../components/admin/SimpleLineChart';

const formatRupiah = (angka) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: 'Minggu Ini' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'custom', label: 'Custom' },
];

export default function AdminReconciliation() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const buildParams = useCallback(() => {
    const params = { period };
    if (period === 'custom') {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    return params;
  }, [period, startDate, endDate]);

  const fetchData = useCallback(() => {
    // Untuk custom, jangan fetch dulu sebelum kedua tanggal diisi
    if (period === 'custom' && (!startDate || !endDate)) return;

    setIsLoading(true);
    setError('');

    api.get('/admin/reconciliation', { params: buildParams() })
      .then(res => setData(res.data.data))
      .catch(err => {
        console.error(err);
        if (err.response?.status === 403 || err.response?.status === 401) {
          navigate('/');
          return;
        }
        setError(err.response?.data?.message || 'Gagal memuat laporan rekonsiliasi.');
      })
      .finally(() => setIsLoading(false));
  }, [period, startDate, endDate, buildParams, navigate]);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleApplyCustom = () => {
    if (!startDate || !endDate) return;
    fetchData();
  };

  const handleExportCsv = async () => {
    if (period === 'custom' && (!startDate || !endDate)) return;

    setIsExporting(true);
    try {
      const res = await api.get('/admin/reconciliation/export', {
        params: buildParams(),
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rekonsiliasi_${period}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh CSV. Coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const summary = data?.summary;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-display font-700 text-2xl">Rekonsiliasi Keuangan</h1>
            <p className="text-xs text-ink/60 mt-1">{data?.period?.label} ({data?.period?.start} s/d {data?.period?.end})</p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={isExporting || (period === 'custom' && (!startDate || !endDate))}
            className="px-4 py-2 bg-ink text-white text-sm font-bold rounded-lg hover:bg-ink/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Mengunduh...' : '⬇ Download CSV'}
          </button>
        </div>

        {/* Filter periode */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-2 text-sm font-bold rounded-lg border-2 border-ink transition-colors ${
                period === opt.value ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-ink/5'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm border-2 border-ink rounded-lg"
              />
              <span className="text-ink/50 text-sm">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm border-2 border-ink rounded-lg"
              />
              <button
                onClick={handleApplyCustom}
                disabled={!startDate || !endDate}
                className="px-4 py-2 bg-gold-400 text-ink text-sm font-bold rounded-lg disabled:opacity-40"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="card p-4 bg-red-50 border-red-700 text-red-700 text-sm font-bold mb-6">{error}</div>
        )}

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-ink/50">Memuat laporan...</div>
        ) : summary && (
          <>
            {/* Kartu ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Pendapatan (Sukses)" value={formatRupiah(summary.revenue)} sub={`${summary.success_count} transaksi`} />
              <SummaryCard label="Modal ke Digiflazz" value={formatRupiah(summary.cost)} tone="red" />
              <SummaryCard label="Profit Kotor" value={formatRupiah(summary.profit)} tone="gold" highlight />
              <SummaryCard label="Isi Saldo Wallet (Deposit)" value={formatRupiah(summary.wallet_topup_total)} sub="Uang masuk terpisah, belum tentu dibelanjakan" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard label="Total Sudah Direfund" value={formatRupiah(summary.refunded_total)} sub="Otomatis + manual selesai" tone="violet" />
              <SummaryCard
                label="Menunggu Refund Manual"
                value={formatRupiah(summary.pending_manual_refund_total)}
                sub={`${summary.pending_manual_refund_count} transaksi guest`}
                tone={summary.pending_manual_refund_count > 0 ? 'red' : 'default'}
                alert={summary.pending_manual_refund_count > 0}
              />
              <SummaryCard
                label="Perlu Review Reconciliation"
                value={summary.needs_reconciliation_review_count}
                sub="Status Digiflazz belum bisa dipastikan sistem"
                tone={summary.needs_reconciliation_review_count > 0 ? 'amber' : 'default'}
                alert={summary.needs_reconciliation_review_count > 0}
                isCount
              />
              <SummaryCard
                label="Rincian Status Transaksi"
                isBreakdown
                breakdown={summary.status_breakdown}
              />
            </div>

            {(summary.pending_manual_refund_count > 0 || summary.needs_reconciliation_review_count > 0) && (
              <div className="card p-4 bg-amber-50 border-amber-600 text-amber-800 text-sm font-bold mb-6 flex items-center justify-between flex-wrap gap-3">
                <span>
                  ⚠ Ada transaksi yang butuh tindak lanjut admin pada rentang ini.
                </span>
                <button
                  onClick={() => navigate('/admin/transactions')}
                  className="px-4 py-2 bg-ink text-white text-xs font-bold rounded-lg"
                >
                  Buka Manajemen Transaksi →
                </button>
              </div>
            )}

            {/* Grafik */}
            <div className="card p-6 bg-white mb-8">
              <h2 className="text-sm font-bold text-ink/70 mb-4">Tren Pendapatan vs Modal vs Profit</h2>
              <SimpleLineChart data={data.timeseries} />
            </div>

            {/* Tabel rincian harian (pelengkap grafik, angka presisi) */}
            <div>
              <h2 className="text-sm font-bold text-ink/70 mb-3">Rincian Per Hari</h2>
              <div className="card p-0 bg-white overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink/5 border-b-2 border-ink text-[10px] tracking-widest text-ink/70">
                    <tr>
                      <th className="p-4 font-bold">TANGGAL</th>
                      <th className="p-4 font-bold">PENDAPATAN</th>
                      <th className="p-4 font-bold">MODAL</th>
                      <th className="p-4 font-bold">PROFIT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ink/5">
                    {data.timeseries.map(row => (
                      <tr key={row.date} className="hover:bg-violet-50/50">
                        <td className="p-4 font-mono text-xs">{row.date}</td>
                        <td className="p-4">{formatRupiah(row.revenue)}</td>
                        <td className="p-4 text-red-700">{formatRupiah(row.cost)}</td>
                        <td className="p-4 font-bold text-gold-700">{formatRupiah(row.profit)}</td>
                      </tr>
                    ))}
                    {data.timeseries.length === 0 && (
                      <tr><td colSpan="4" className="p-8 text-center text-ink/70">Tidak ada transaksi sukses pada rentang ini</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone = 'default', highlight = false, alert = false, isCount = false, isBreakdown = false, breakdown = {} }) {
  const toneClasses = {
    default: 'text-ink',
    red: 'text-red-700',
    gold: 'text-gold-700',
    violet: 'text-violet-700',
    amber: 'text-amber-700',
  };

  const cardClasses = alert
    ? 'card p-5 bg-white border-red-600'
    : highlight
    ? 'card p-5 bg-white border-gold-500'
    : 'card p-5 bg-white';

  if (isBreakdown) {
    const entries = Object.entries(breakdown || {});
    return (
      <div className="card p-5 bg-white">
        <p className="text-xs text-ink/70 font-bold mb-2">{label}</p>
        {entries.length === 0 ? (
          <p className="text-xs text-ink/40">Tidak ada transaksi</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {entries.map(([status, count]) => (
              <span key={status} className="text-[10px] font-bold px-2 py-1 rounded-md bg-ink/5 border border-ink/20">
                {status}: {count}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cardClasses}>
      <p className="text-xs text-ink/70 font-bold mb-1">{label}</p>
      <p className={`font-display font-700 text-2xl ${toneClasses[tone]}`}>
        {isCount ? value : value}
      </p>
      {sub && <p className="text-[11px] text-ink/50 mt-1">{sub}</p>}
    </div>
  );
}