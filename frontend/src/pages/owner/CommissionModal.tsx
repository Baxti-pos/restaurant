import React, { useState, useEffect } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { api } from "../../lib/api";
import { WaiterCommissionSummary } from "../../lib/types";
import { formatCurrency, formatDateTime } from "../../lib/formatters";
import { toast } from "../../components/ui/Toast";
import { DollarSign, History, User } from "lucide-react";

interface CommissionModalProps {
  waiterId: string;
  waiterName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommissionModal({
  waiterId,
  waiterName,
  isOpen,
  onClose,
}: CommissionModalProps) {
  const [summary, setSummary] = useState<WaiterCommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.waiters.getCommissionSummary(waiterId);
      setSummary(data);
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen, waiterId]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error("To'lov miqdorini kiriting");
      return;
    }

    setSaving(true);
    try {
      await api.waiters.addCommissionPayout(waiterId, {
        amount,
        note: payoutNote,
      });
      toast.success("To'lov saqlandi");
      setPayoutAmount("");
      setPayoutNote("");
      loadSummary();
    } catch (error) {
      toast.error("To'lovni saqlashda xato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 italic">
          <User className="h-5 w-5 text-indigo-600" />
          <span>{waiterName} — Komissiya balansi</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Yuklanmoqda...</div>
        ) : !summary ? (
          <div className="py-10 text-center text-slate-500">
            Ma'lumot topilmadi
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 transition-all hover:shadow-sm">
                <div className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">
                  Jami ishlab topilgan
                </div>
                <div className="text-xl font-bold text-indigo-900">
                  {formatCurrency(summary.totalEarned)}
                </div>
                <div className="text-xs text-indigo-500 mt-1">
                  Ulush: {summary.salesSharePercent}%
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 transition-all hover:shadow-sm">
                <div className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">
                  Jami to'langan
                </div>
                <div className="text-xl font-bold text-emerald-900">
                  {formatCurrency(summary.totalPaid)}
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 transition-all hover:shadow-sm">
                <div className="text-xs text-amber-600 font-medium uppercase tracking-wider mb-1">
                  Qolgan balans
                </div>
                <div className="text-xl font-bold text-amber-900">
                  {formatCurrency(summary.balance)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payout Form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 uppercase">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  To'lov qilish
                </div>
                <form
                  onSubmit={handlePayout}
                  className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-inner space-y-4"
                >
                  <Input
                    label="To'lov miqdori"
                    type="number"
                    placeholder="Masalan: 50000"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    required
                  />
                  <Input
                    label="Izoh (ixtiyoriy)"
                    placeholder="Masalan: Haftalik ulush"
                    value={payoutNote}
                    onChange={(e) => setPayoutNote(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold transition-all active:scale-[0.98]"
                    variant="primary"
                    isLoading={saving}
                  >
                    To'lovni saqlash
                  </Button>
                </form>
              </div>

              {/* Payout History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 uppercase">
                  <History className="h-4 w-4 text-indigo-500" />
                  To'lovlar tarixi
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {summary.payouts.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
                      Hali to'lovlar amalga oshirilmagan
                    </div>
                  ) : (
                    summary.payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 flex justify-between items-start gap-4 transition-colors hover:bg-slate-50 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(payout.amount)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                            {payout.note || "Izoh yo'q"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] uppercase font-medium text-slate-400">
                            {formatDateTime(payout.paidAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
