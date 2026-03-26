import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Minus, PhoneCall, Plus, ShoppingCart, X } from 'lucide-react';
import { publicQrApi } from '../../lib/publicQrApi';
import {
  PublicMenuBootstrap,
  PublicMenuProduct,
  PublicQrOrderStatus,
  PublicQrServiceRequestStatus
} from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';
import { toast } from '../../components/ui/Toast';
import { clsx } from 'clsx';

interface CartItem {
  product: PublicMenuProduct;
  quantity: number;
}

const STORAGE_PREFIX = 'baxti-qr';

const buildStorageKey = (qrToken: string, suffix: string) => `${STORAGE_PREFIX}:${qrToken}:${suffix}`;

const isFinalOrderStatus = (status?: string | null) =>
  status === 'SERVED' || status === 'REJECTED' || status === 'CANCELED';

const isFinalServiceStatus = (status?: string | null) =>
  status === 'COMPLETED' || status === 'CANCELED';

export function PublicQrMenuPage() {
  const { qrToken = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<PublicMenuBootstrap | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [sessionKey, setSessionKey] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<PublicQrOrderStatus | null>(null);
  const [serviceStatus, setServiceStatus] = useState<PublicQrServiceRequestStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const categories = useMemo(
    () => [{ id: 'all', name: 'Barchasi', sortOrder: -1 }, ...(bootstrap?.categories ?? [])],
    [bootstrap]
  );

  const filteredProducts = useMemo(() => {
    if (!bootstrap) return [];
    if (selectedCategory === 'all') return bootstrap.products;
    return bootstrap.products.filter((product) => product.categoryId === selectedCategory);
  }, [bootstrap, selectedCategory]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const data = await publicQrApi.bootstrap(qrToken);
        if (!mounted) return;
        setBootstrap(data);

        const savedSession = window.localStorage.getItem(buildStorageKey(qrToken, 'sessionKey'));
        const session = await publicQrApi.createSession(qrToken, savedSession);
        if (!mounted) return;
        setSessionKey(session.sessionKey);
        window.localStorage.setItem(buildStorageKey(qrToken, 'sessionKey'), session.sessionKey);

        const storedOrderCode = window.localStorage.getItem(buildStorageKey(qrToken, 'lastOrderCode'));
        if (storedOrderCode) {
          try {
            const status = await publicQrApi.getOrderStatus(qrToken, storedOrderCode);
            if (mounted) {
              setOrderStatus(status);
              if (isFinalOrderStatus(status.trackingStatus)) {
                window.localStorage.removeItem(buildStorageKey(qrToken, 'lastOrderCode'));
              }
            }
          } catch {
            window.localStorage.removeItem(buildStorageKey(qrToken, 'lastOrderCode'));
          }
        }

        const storedServiceCode = window.localStorage.getItem(buildStorageKey(qrToken, 'lastServiceCode'));
        if (storedServiceCode) {
          try {
            const status = await publicQrApi.getServiceRequestStatus(qrToken, storedServiceCode);
            if (mounted) {
              setServiceStatus(status);
              if (isFinalServiceStatus(status.status)) {
                window.localStorage.removeItem(buildStorageKey(qrToken, 'lastServiceCode'));
              }
            }
          } catch {
            window.localStorage.removeItem(buildStorageKey(qrToken, 'lastServiceCode'));
          }
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(error instanceof Error ? error.message : 'QR menyuni yuklab bo\'lmadi');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [qrToken]);

  useEffect(() => {
    if (!qrToken || !orderStatus || isFinalOrderStatus(orderStatus.trackingStatus)) {
      return;
    }

    const interval = window.setInterval(() => {
      void publicQrApi
        .getOrderStatus(qrToken, orderStatus.publicCode)
        .then((status) => {
          setOrderStatus(status);
          if (isFinalOrderStatus(status.trackingStatus)) {
            window.localStorage.removeItem(buildStorageKey(qrToken, 'lastOrderCode'));
          }
        })
        .catch(() => {});
    }, 5000);

    return () => window.clearInterval(interval);
  }, [qrToken, orderStatus]);

  useEffect(() => {
    if (!qrToken || !serviceStatus || isFinalServiceStatus(serviceStatus.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void publicQrApi
        .getServiceRequestStatus(qrToken, serviceStatus.publicCode)
        .then((status) => {
          setServiceStatus(status);
          if (isFinalServiceStatus(status.status)) {
            window.localStorage.removeItem(buildStorageKey(qrToken, 'lastServiceCode'));
          }
        })
        .catch(() => {});
    }, 5000);

    return () => window.clearInterval(interval);
  }, [qrToken, serviceStatus]);

  const upsertCartItem = (product: PublicMenuProduct, delta: number) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing && delta < 0) {
        return current;
      }

      if (!existing) {
        return [...current, { product, quantity: 1 }];
      }

      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return current.filter((item) => item.product.id !== product.id);
      }

      return current.map((item) =>
        item.product.id === product.id ? { ...item, quantity: nextQty } : item
      );
    });
  };

  const handleSubmitOrder = async () => {
    if (!sessionKey || cart.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const clientRequestId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `qr_${Date.now()}`;

      const result = await publicQrApi.createOrder(qrToken, {
        sessionKey,
        clientRequestId,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      });

      window.localStorage.setItem(buildStorageKey(qrToken, 'lastOrderCode'), result.publicCode);
      const status = await publicQrApi.getOrderStatus(qrToken, result.publicCode);
      setOrderStatus(status);
      setCart([]);
      setCartOpen(false);
      toast.success('Buyurtmangiz yuborildi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Buyurtma yuborilmadi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallWaiter = async () => {
    if (!sessionKey || !bootstrap?.table.callWaiterEnabled) {
      return;
    }

    setCallingWaiter(true);
    try {
      const result = await publicQrApi.createServiceRequest(qrToken, {
        sessionKey
      });
      window.localStorage.setItem(buildStorageKey(qrToken, 'lastServiceCode'), result.publicCode);
      const status = await publicQrApi.getServiceRequestStatus(qrToken, result.publicCode);
      setServiceStatus(status);
      toast.success('Girgitton chaqirildi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chaqiruv yuborilmadi');
    } finally {
      setCallingWaiter(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-950 text-white flex items-center justify-center px-6'>
        <div className='text-center'>
          <div className='h-10 w-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4' />
          <p className='text-sm text-slate-300'>Menyu yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !bootstrap) {
    return (
      <div className='min-h-screen bg-slate-950 text-white flex items-center justify-center px-6'>
        <div className='max-w-sm text-center'>
          <h1 className='text-2xl font-bold mb-3'>QR faol emas</h1>
          <p className='text-sm text-slate-300'>{errorMessage || 'Bu stol uchun QR menyu topilmadi'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-950 text-white'>
      <div className='mx-auto max-w-md min-h-screen flex flex-col'>
        <header className='sticky top-0 z-20 backdrop-blur bg-slate-950/90 border-b border-white/10 px-4 pt-5 pb-4'>
          <p className='text-xs uppercase tracking-[0.25em] text-slate-400'>Baxti QR menu</p>
          <div className='flex items-start justify-between gap-3 mt-2'>
            <div>
              <h1 className='text-2xl font-bold'>{bootstrap.branch.name}</h1>
              <p className='text-sm text-slate-300'>{bootstrap.table.name}</p>
            </div>
            <span className='inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300'>
              {bootstrap.table.selfOrderEnabled ? 'Buyurtma ochiq' : 'Faqat menyu'}
            </span>
          </div>
        </header>

        <div className='px-4 pt-4 space-y-4'>
          {(orderStatus || serviceStatus) && (
            <div className='space-y-3'>
              {orderStatus && (
                <div className='rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-4'>
                  <div className='flex items-center justify-between gap-3 mb-2'>
                    <div>
                      <p className='text-sm font-semibold'>Buyurtma holati</p>
                      <p className='text-xs text-slate-300'>Kod: {orderStatus.publicCode}</p>
                    </div>
                    <span className='text-xs font-semibold rounded-full bg-white/10 px-3 py-1'>
                      {orderStatus.trackingStatus === 'PENDING'
                        ? 'Qabul kutilmoqda'
                        : orderStatus.trackingStatus === 'ACCEPTED'
                          ? 'Qabul qilindi'
                          : orderStatus.trackingStatus === 'PREPARING'
                            ? 'Tayyorlanmoqda'
                            : orderStatus.trackingStatus === 'READY'
                              ? 'Tayyor'
                              : orderStatus.trackingStatus === 'SERVED'
                                ? 'Yetkazildi'
                                : orderStatus.trackingStatus === 'REJECTED'
                                  ? 'Rad etildi'
                                  : 'Bekor qilindi'}
                    </span>
                  </div>
                  {orderStatus.rejectionReason && (
                    <p className='text-xs text-amber-300'>Sabab: {orderStatus.rejectionReason}</p>
                  )}
                </div>
              )}

              {serviceStatus && (
                <div className='rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-semibold'>Girgitton chaqiruvi</p>
                      <p className='text-xs text-slate-300'>Kod: {serviceStatus.publicCode}</p>
                    </div>
                    <span className='text-xs font-semibold rounded-full bg-white/10 px-3 py-1'>
                      {serviceStatus.status === 'PENDING'
                        ? 'Yuborildi'
                        : serviceStatus.status === 'ACKNOWLEDGED'
                          ? 'Qabul qilindi'
                          : serviceStatus.status === 'COMPLETED'
                            ? 'Bajarildi'
                            : 'Bekor qilindi'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='flex gap-2 overflow-x-auto pb-1 no-scrollbar'>
            {categories.map((category) => (
              <button
                key={category.id}
                type='button'
                onClick={() => setSelectedCategory(category.id)}
                className={clsx(
                  'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  selectedCategory === category.id
                    ? 'bg-white text-slate-950'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <main className='flex-1 px-4 py-4 pb-28'>
          <div className='grid grid-cols-2 gap-3'>
            {filteredProducts.map((product) => {
              const quantityInCart = cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
              return (
                <div
                  key={product.id}
                  className='rounded-3xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur'
                >
                  <div className='aspect-[4/3] bg-slate-900/70'>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='h-full w-full flex items-center justify-center text-slate-500 text-xs px-4 text-center'>
                        Rasm mavjud emas
                      </div>
                    )}
                  </div>
                  <div className='p-3'>
                    <p className='text-sm font-semibold leading-5 min-h-[2.5rem]'>{product.name}</p>
                    <p className='text-xs text-slate-400 mt-1 min-h-[1rem]'>
                      {product.portionLabel || product.categoryName}
                    </p>
                    <div className='mt-3 flex items-center justify-between gap-2'>
                      <div>
                        <p className='text-sm font-bold text-emerald-300'>{formatCurrency(product.price)}</p>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <button
                          type='button'
                          onClick={() => upsertCartItem(product, -1)}
                          className='h-8 w-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center'
                        >
                          <Minus className='h-4 w-4' />
                        </button>
                        <span className='w-5 text-center text-sm font-semibold'>{quantityInCart}</span>
                        <button
                          type='button'
                          onClick={() => upsertCartItem(product, 1)}
                          className='h-8 w-8 rounded-full bg-white text-slate-950 flex items-center justify-center'
                        >
                          <Plus className='h-4 w-4' />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <div className='fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur border-t border-white/10'>
          <div className='mx-auto max-w-md px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-3'>
            {bootstrap.table.callWaiterEnabled && (
              <button
                type='button'
                onClick={handleCallWaiter}
                disabled={callingWaiter}
                className='w-full h-12 rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-60'
              >
                <PhoneCall className='h-4 w-4' />
                {callingWaiter ? 'Yuborilmoqda...' : 'Girgittonni chaqirish'}
              </button>
            )}
            <button
              type='button'
              onClick={() => setCartOpen(true)}
              disabled={!bootstrap.table.selfOrderEnabled || cartCount === 0}
              className='w-full h-14 rounded-2xl bg-white text-slate-950 font-semibold disabled:opacity-50 flex items-center justify-between px-4'
            >
              <span className='flex items-center gap-2'>
                <ShoppingCart className='h-5 w-5' />
                Savatcha ({cartCount})
              </span>
              <span>{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        </div>

        {cartOpen && (
          <div className='fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm'>
            <div className='mx-auto max-w-md h-full bg-slate-950 flex flex-col'>
              <div className='px-4 py-4 border-b border-white/10 flex items-center justify-between'>
                <div>
                  <h2 className='text-lg font-bold'>Savatcha</h2>
                  <p className='text-sm text-slate-400'>{cartCount} ta mahsulot</p>
                </div>
                <button type='button' onClick={() => setCartOpen(false)} className='p-2 text-slate-300'>
                  <X className='h-5 w-5' />
                </button>
              </div>

              <div className='flex-1 overflow-y-auto px-4 py-4 space-y-3'>
                {cart.map((item) => (
                  <div key={item.product.id} className='rounded-2xl border border-white/10 bg-white/5 p-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='font-semibold'>{item.product.name}</p>
                        <p className='text-xs text-slate-400 mt-1'>
                          {item.product.portionLabel || item.product.categoryName}
                        </p>
                      </div>
                      <p className='font-semibold text-emerald-300'>
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                    <div className='mt-3 flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => upsertCartItem(item.product, -1)}
                        className='h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center'
                      >
                        <Minus className='h-4 w-4' />
                      </button>
                      <span className='w-6 text-center font-semibold'>{item.quantity}</span>
                      <button
                        type='button'
                        onClick={() => upsertCartItem(item.product, 1)}
                        className='h-9 w-9 rounded-full bg-white text-slate-950 flex items-center justify-center'
                      >
                        <Plus className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className='px-4 py-4 border-t border-white/10 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-slate-400'>Jami summa</span>
                  <span className='text-lg font-bold'>{formatCurrency(cartTotal)}</span>
                </div>
                <button
                  type='button'
                  onClick={handleSubmitOrder}
                  disabled={submitting || cart.length === 0 || !bootstrap.table.selfOrderEnabled}
                  className='w-full h-12 rounded-2xl bg-white text-slate-950 font-semibold disabled:opacity-50'
                >
                  {submitting ? 'Yuborilmoqda...' : 'Buyurtma berish'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
