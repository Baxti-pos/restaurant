import React from 'react';
import { ArrowUpRight, ArrowDownRight, BoxIcon } from 'lucide-react';
import { clsx } from 'clsx';
interface StatCardProps {
  title: string;
  value: string | number;
  icon: BoxIcon;
  subtitle?: string;
  trend?: number;
  color?: 'indigo' | 'green' | 'red' | 'amber';
}
export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color = 'indigo'
}: StatCardProps) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
            {title}
          </p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-slate-900 break-words">
            {value}
          </p>
        </div>
        <div
          className={clsx(
            'rounded-xl p-2 sm:p-3 ml-3 sm:ml-4 flex-shrink-0',
            colors[color]
          )}>

          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      {(subtitle || trend !== undefined) &&
      <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm">
          {trend !== undefined && (
        trend >= 0 ?
        <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 mr-1" /> :

        <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />)
        }
          <span className="text-slate-500">{subtitle}</span>
        </div>
      }
    </div>);

}