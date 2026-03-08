import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Phone, Lock, Eye, EyeOff, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import { Branch, User } from '../lib/types';
interface LoginPageProps {
  onLogin: (
    user: User,
    token: string,
    activeBranchId: string | null,
    branches: Branch[]
  ) => void;
}
export function LoginPage({ onLogin }: LoginPageProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{
    phone?: string;
    password?: string;
  }>({});
  const validate = () => {
    const e: typeof errors = {};
    if (!phone.trim()) e.phone = 'Telefon raqam kiritilishi shart';
    if (!password.trim()) e.password = 'Parol kiritilishi shart';else
    if (password.length < 4)
    e.password = "Parol kamida 4 ta belgidan iborat bo'lishi kerak";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { user, token, activeBranchId, branches } = await api.auth.login(phone, password);
      onLogin(user, token, activeBranchId, branches);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 mb-5">
              <Utensils className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tizimga kirish
            </h1>
            <p className="text-slate-500 text-sm mt-1">Hisobingizga kiring</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Telefon raqam"
                type="tel"
                placeholder="+998 90 123 45 67"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((p) => ({
                    ...p,
                    phone: undefined
                  }));
                }}
                icon={<Phone className="h-4 w-4" />}
                error={errors.phone}
                required />


              <div className="relative">
                <Input
                  label="Parol"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({
                      ...p,
                      password: undefined
                    }));
                  }}
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.password}
                  required />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors">

                  {showPassword ?
                  <EyeOff className="h-4 w-4" /> :

                  <Eye className="h-4 w-4" />
                  }
                </button>
              </div>

              {error &&
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              }

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Kirish
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>);

}
