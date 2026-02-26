import React from 'react';
import { clsx } from 'clsx';
interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}
function SkeletonLine({ className }: {className?: string;}) {
  return (
    <div className={clsx('animate-pulse bg-slate-200 rounded-lg', className)} />);

}
export function LoadingSkeleton({ rows = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({
        length: rows
      }).map((_, i) =>
      <SkeletonLine
        key={i}
        className="h-4 w-full"
        style={
        {
          width: `${85 + Math.random() * 15}%`
        } as any
        } />

      )}
    </div>);

}
export function TableSkeleton({ rows = 5 }: {rows?: number;}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 flex space-x-8">
        {[40, 25, 20, 15].map((w, i) =>
        <SkeletonLine
          key={i}
          className="h-4"
          style={
          {
            width: `${w}%`
          } as any
          } />

        )}
      </div>
      {Array.from({
        length: rows
      }).map((_, i) =>
      <div
        key={i}
        className="px-6 py-4 border-t border-slate-100 flex space-x-8">

          {[40, 25, 20, 15].map((w, j) =>
        <SkeletonLine
          key={j}
          className="h-4"
          style={
          {
            width: `${w}%`
          } as any
          } />

        )}
        </div>
      )}
    </div>);

}
export function CardSkeleton({ count = 4 }: {count?: number;}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({
        length: count
      }).map((_, i) =>
      <div
        key={i}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">

          <div className="flex justify-between">
            <SkeletonLine className="h-4 w-1/2" />
            <SkeletonLine className="h-10 w-10 rounded-lg" />
          </div>
          <SkeletonLine className="h-8 w-2/3" />
          <SkeletonLine className="h-3 w-1/3" />
        </div>
      )}
    </div>);

}
export function GridSkeleton({ count = 8 }: {count?: number;}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({
        length: count
      }).map((_, i) =>
      <div
        key={i}
        className="bg-white rounded-xl border border-slate-200 p-6 aspect-square flex flex-col items-center justify-center space-y-3">

          <SkeletonLine className="h-16 w-16 rounded-full" />
          <SkeletonLine className="h-4 w-16" />
        </div>
      )}
    </div>);

}