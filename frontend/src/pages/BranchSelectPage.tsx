import React, { useState } from 'react';
import { Branch } from '../lib/types';
import { Button } from '../components/ui/Button';
import { MapPin, Clock, Check, LogOut, Utensils } from 'lucide-react';
import { clsx } from 'clsx';
interface BranchSelectPageProps {
  branches: Branch[];
  onSelect: (branchId: string) => void;
  onLogout: () => void;
}
export function BranchSelectPage({
  branches,
  onSelect,
  onLogout
}: BranchSelectPageProps) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 mb-5">
            <Utensils className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Filialni tanlang
          </h1>
          <p className="text-slate-500 mt-1">Ishlash uchun filialni tanlang</p>
        </div>

        {/* Branch cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {branches.map((branch) =>
          <button
            key={branch.id}
            onClick={() => {
              setSelected(branch.id);
              onSelect(branch.id);
            }}
            className={clsx(
              'relative text-left p-5 bg-white rounded-2xl border-2 transition-all hover:shadow-md',
              selected === branch.id ?
              'border-indigo-500 shadow-md shadow-indigo-100' :
              'border-slate-200 hover:border-slate-300'
            )}>

              {selected === branch.id &&
            <div className="absolute top-4 right-4 h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
            }
              <div className="mb-3">
                <h3 className="font-semibold text-slate-900 text-base pr-8">
                  {branch.name}
                </h3>
              </div>
              <div className="flex items-start space-x-2 text-sm text-slate-500 mb-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{branch.address}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  Smena: {branch.shiftStart} – {branch.shiftEnd}
                </span>
              </div>
            </button>
          )}
        </div>

        <div className="text-center mt-2">
          <button
            onClick={onLogout}
            className="text-sm text-slate-400 hover:text-red-500 flex items-center justify-center mx-auto space-x-1.5 transition-colors">

            <LogOut className="h-4 w-4" />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </div>
    </div>);

}