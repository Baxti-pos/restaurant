import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { toast } from "../../components/ui/Toast";
import { Plus, Edit2, Trash2, Users, User, Phone, Lock } from "lucide-react";
import { api } from "../../lib/api";
import { getAuth } from "../../lib/auth";
import { hasPermission } from "../../lib/permissions";
import { Waiter } from "../../lib/types";
interface WaitersPageProps {
  activeBranchId: string;
  activeBranchName: string;
}
const shiftBadge = (s: Waiter["shiftStatus"]) => {
  if (s === "active") return <Badge variant="success">Smenada</Badge>;
  if (s === "ended") return <Badge variant="warning">Smena tugagan</Badge>;
  return <Badge variant="secondary">Boshlanmagan</Badge>;
};
const PHONE_PREFIX = "+998";
const PHONE_PATTERN = /^\+998\d{9}$/;
const PASSWORD_MIN = 4;

const normalizePhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  return `${PHONE_PREFIX}${local.slice(0, 9)}`;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Xatolik yuz berdi. Qayta urinib ko";

export function WaitersPage({
  activeBranchId,
  activeBranchName,
}: WaitersPageProps) {
  const authUser = getAuth().user;
  const canManageWaiters = hasPermission(authUser, "WAITERS_MANAGE");
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Waiter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Waiter | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: PHONE_PREFIX,
    password: "",
    isEnabled: true,
    salesSharePercent: "8",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const load = () => {
    setLoading(true);
    api.waiters
      .listByBranch(activeBranchId)
      .then((d) => {
        setWaiters(d);
      })
      .catch((error: unknown) => {
        setWaiters([]);
        toast.error(getErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    load();
  }, [activeBranchId]);
  const openCreate = () => {
    if (!canManageWaiters) return;
    setEditing(null);
    setForm({
      name: "",
      phone: PHONE_PREFIX,
      password: "",
      isEnabled: true,
      salesSharePercent: "8",
    });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (w: Waiter) => {
    if (!canManageWaiters) return;
    setEditing(w);
    setForm({
      name: w.name,
      phone: w.phone ? normalizePhoneInput(w.phone) : PHONE_PREFIX,
      password: "",
      isEnabled: w.isEnabled,
      salesSharePercent: String(w.salesSharePercent),
    });
    setErrors({});
    setModalOpen(true);
  };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    if (!PHONE_PATTERN.test(form.phone)) {
      e.phone = "Telefon +998901234567 formatida bo'lishi shart";
    }
    const password = form.password.trim();
    if (!editing && password.length < PASSWORD_MIN) {
      e.password = `Parol kamida ${PASSWORD_MIN} ta belgidan iborat bo'lishi kerak`;
    }
    if (editing && password && password.length < PASSWORD_MIN) {
      e.password = `Parol kamida ${PASSWORD_MIN} ta belgidan iborat bo'lishi kerak`;
    }
    const share = Number(form.salesSharePercent);
    if (!Number.isFinite(share) || share < 0 || share > 100) {
      e.salesSharePercent = "Ulush foizi 0 dan 100 gacha bo'lishi kerak";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canManageWaiters) return;
    if (!validate()) return;
    const payload = {
      name: form.name,
      phone: normalizePhoneInput(form.phone),
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
      isEnabled: form.isEnabled,
      salesSharePercent: Number(form.salesSharePercent),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.waiters.update(editing.id, payload);
        toast.success("Girgitton yangilandi");
      } else {
        await api.waiters.create(payload);
        toast.success("Girgitton qo'shildi");
      }
      setModalOpen(false);
      load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!canManageWaiters) return;
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.waiters.delete(deleteTarget.id);
      toast.deleted("Girgitton o'chirildi");
      setDeleteTarget(null);
      load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-end lg:justify-between">
        <div className="hidden lg:block">
          <h1 className="text-lg md:text-xl font-bold text-slate-900">
            Girgittonlar
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Faol filial:{" "}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>
        {/* Mobile: Icon Button */}
        {canManageWaiters && (
          <div className="md:hidden">
            <Button size="icon" onClick={openCreate}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}
        {/* Desktop: Full Button */}
        {canManageWaiters && (
          <div className="hidden md:block">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Girgitton qo'shish
            </Button>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canManageWaiters && (
        <button
          onClick={openCreate}
          className="lg:hidden fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Girgitton qo'shish"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      {loading ? (
        <TableSkeleton />
      ) : waiters.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            Bu filialda hali Girgittonlar yo'q
          </p>
          {canManageWaiters && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Girgitton qo'shish
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile List Cards */}
          <div className="md:hidden space-y-2">
            {waiters.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{w.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {w.phone && (
                      <div className="flex items-center text-xs text-slate-500">
                        <Phone className="h-3 w-3 mr-1" />
                        {w.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {shiftBadge(w.shiftStatus)}
                    {w.isEnabled ? (
                      <Badge variant="success">Faol</Badge>
                    ) : (
                      <Badge variant="danger">Bloklangan</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ulushi:{" "}
                    <span className="font-medium">{w.salesSharePercent}%</span>
                  </p>
                </div>
                {canManageWaiters && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openEdit(w)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(w)}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ism
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ulush
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Smena holati
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Holat
                    </th>
                    {canManageWaiters && (
                      <th className="px-5 py-3.5 text-right font-medium">
                        Amallar
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waiters.map((w) => (
                    <tr
                      key={w.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-slate-900">
                            {w.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {w.phone || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {w.salesSharePercent}%
                      </td>
                      <td className="px-5 py-4 text-center">
                        {shiftBadge(w.shiftStatus)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {w.isEnabled ? (
                          <Badge variant="success">Faol</Badge>
                        ) : (
                          <Badge variant="danger">Bloklangan</Badge>
                        )}
                      </td>
                      {canManageWaiters && (
                        <td className="px-5 py-4 text-right space-x-1">
                          <button
                            onClick={() => openEdit(w)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(w)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Girgittonni tahrirlash" : "Yangi girgitton"}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Ism familiya"
            placeholder="Jasur Toshmatov"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            error={errors.name}
            required
          />

          <Input
            label="Telefon raqam"
            placeholder="+998901234567"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: normalizePhoneInput(e.target.value),
              })
            }
            onFocus={() =>
              setForm((prev) => ({
                ...prev,
                phone: normalizePhoneInput(prev.phone || PHONE_PREFIX),
              }))
            }
            maxLength={13}
            error={errors.phone}
            required
          />

          <Input
            label={editing ? "Yangi parol (ixtiyoriy)" : "Parol"}
            type="password"
            placeholder={editing ? "Agar o'zgarmasa bo'sh qoldiring" : "Kamida 4 ta belgi"}
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            error={errors.password}
            required={!editing}
            icon={<Lock className="h-4 w-4" />}
          />

          <Input
            label="Ulush foizi"
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="8"
            value={form.salesSharePercent}
            onChange={(e) =>
              setForm({
                ...form,
                salesSharePercent: e.target.value,
              })
            }
            error={errors.salesSharePercent}
            required
          />

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" isLoading={saving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Girgittonni o'chirish"
        message={`"${deleteTarget?.name}" ni o'chirishni tasdiqlaysizmi?`}
        isLoading={deleting}
      />
    </div>
  );
}
