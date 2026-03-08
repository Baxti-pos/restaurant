import { useEffect, useState } from 'react';
import { User } from '../../lib/types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { toast } from '../../components/ui/Toast';

interface ProfilePageProps {
  user: User;
  onUserChange: (user: User, token?: string) => void;
}

const PHONE_PREFIX = '+998';
const PHONE_PATTERN = /^\+998\d{9}$/;

const normalizePhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('998') ? digits.slice(3) : digits;
  return `${PHONE_PREFIX}${local.slice(0, 9)}`;
};

const getErrorMessage = (error: unknown) =>
error instanceof Error ? error.message : 'Xatolik yuz berdi. Qayta urinib ko';

export function ProfilePage({ user, onUserChange }: ProfilePageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: user.name || '',
    phone: user.phone ? normalizePhoneInput(user.phone) : PHONE_PREFIX,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProfile = () => {
    setLoading(true);
    api.ownerProfile.get().
    then((profile) => {
      setForm((prev) => ({
        ...prev,
        fullName: profile.fullName,
        phone: profile.phone ? normalizePhoneInput(profile.phone) : PHONE_PREFIX
      }));
      onUserChange(
        {
          ...user,
          name: profile.fullName,
          phone: profile.phone
        }
      );
    }).
    catch((error: unknown) => {
      toast.error(getErrorMessage(error));
    }).
    finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.fullName.trim()) {
      next.fullName = "F.I.Sh kiritilishi shart";
    }

    if (!PHONE_PATTERN.test(form.phone)) {
      next.phone = "Telefon +998901234567 formatida bo'lishi shart";
    }

    const isPasswordChange =
    Boolean(form.currentPassword.trim()) ||
    Boolean(form.newPassword.trim()) ||
    Boolean(form.confirmPassword.trim());

    if (isPasswordChange) {
      if (!form.currentPassword.trim()) {
        next.currentPassword = "Joriy parol kiritilishi shart";
      }

      if (!form.newPassword.trim()) {
        next.newPassword = "Yangi parol kiritilishi shart";
      } else if (form.newPassword.trim().length < 4) {
        next.newPassword = "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak";
      }

      if (form.confirmPassword !== form.newPassword) {
        next.confirmPassword = "Parol tasdig'i mos emas";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload: {
        fullName: string;
        phone: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        fullName: form.fullName.trim(),
        phone: normalizePhoneInput(form.phone)
      };

      if (form.newPassword.trim()) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const result = await api.ownerProfile.update(payload);

      onUserChange(
        {
          ...user,
          name: result.profile.fullName,
          phone: result.profile.phone
        },
        result.token
      );

      setForm((prev) => ({
        ...prev,
        fullName: result.profile.fullName,
        phone: result.profile.phone ? normalizePhoneInput(result.profile.phone) : PHONE_PREFIX,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setErrors({});
      toast.success('Profil ma\'lumotlari yangilandi');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-5 w-44 bg-slate-100 rounded animate-pulse mb-5" />
        <div className="space-y-3">
          <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900">
          Profil
        </h1>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 space-y-4">

        <Input
          label="F.I.Sh"
          value={form.fullName}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              fullName: e.target.value
            }));
            setErrors((prev) => ({
              ...prev,
              fullName: ''
            }));
          }}
          error={errors.fullName}
          required />

        <Input
          label="Telefon raqam"
          value={form.phone}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              phone: normalizePhoneInput(e.target.value)
            }));
            setErrors((prev) => ({
              ...prev,
              phone: ''
            }));
          }}
          error={errors.phone}
          required />

        <div className="h-px bg-slate-100" />

        <p className="text-sm font-semibold text-slate-800">Parolni yangilash</p>

        <Input
          label="Joriy parol"
          type="password"
          value={form.currentPassword}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              currentPassword: e.target.value
            }));
            setErrors((prev) => ({
              ...prev,
              currentPassword: ''
            }));
          }}
          error={errors.currentPassword}
          placeholder="Joriy parolingiz" />

        <Input
          label="Yangi parol"
          type="password"
          value={form.newPassword}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              newPassword: e.target.value
            }));
            setErrors((prev) => ({
              ...prev,
              newPassword: ''
            }));
          }}
          error={errors.newPassword}
          placeholder="Yangi parol" />

        <Input
          label="Yangi parol tasdig'i"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              confirmPassword: e.target.value
            }));
            setErrors((prev) => ({
              ...prev,
              confirmPassword: ''
            }));
          }}
          error={errors.confirmPassword}
          placeholder="Yangi parolni qayta kiriting" />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={saving}>
            Saqlash
          </Button>
        </div>
      </form>
    </div>);
}
