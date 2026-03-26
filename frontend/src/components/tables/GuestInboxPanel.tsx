import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GuestRequestsOverview, OrderItem, OrderItemFulfillmentStatus } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';

interface GuestInboxPanelProps {
  inbox: GuestRequestsOverview | null;
  orderItems: OrderItem[];
  canHandleActions: boolean;
  busyKey?: string | null;
  onAcceptOrder: (requestId: string) => void;
  onRejectOrder: (requestId: string) => void;
  onAcknowledgeCall: (requestId: string) => void;
  onCompleteCall: (requestId: string) => void;
  onAdvanceItemStatus: (item: OrderItem) => void;
}

const fulfillmentLabel: Record<OrderItemFulfillmentStatus, string> = {
  ACCEPTED: 'Qabul qilindi',
  PREPARING: 'Tayyorlanmoqda',
  READY: 'Tayyor',
  SERVED: 'Yetkazildi',
  CANCELED: 'Bekor qilindi'
};

const nextActionLabel: Partial<Record<OrderItemFulfillmentStatus, string>> = {
  ACCEPTED: 'Tayyorlanmoqda',
  PREPARING: 'Tayyor',
  READY: 'Yetkazildi'
};

const statusVariant = (status: OrderItemFulfillmentStatus) => {
  if (status === 'READY' || status === 'SERVED') return 'success' as const;
  if (status === 'CANCELED') return 'danger' as const;
  return 'warning' as const;
};

export function GuestInboxPanel({
  inbox,
  orderItems,
  canHandleActions,
  busyKey,
  onAcceptOrder,
  onRejectOrder,
  onAcknowledgeCall,
  onCompleteCall,
  onAdvanceItemStatus
}: GuestInboxPanelProps) {
  const qrItems = orderItems.filter((item) => item.source === 'QR_CUSTOMER');
  const hasPendingOrders = (inbox?.pendingOrders.length ?? 0) > 0;
  const hasServiceCalls = (inbox?.activeServiceRequests.length ?? 0) > 0;
  const hasQrItems = qrItems.length > 0;

  if (!hasPendingOrders && !hasServiceCalls && !hasQrItems) {
    return null;
  }

  return (
    <div className='space-y-3 mb-4'>
      {hasPendingOrders && (
        <section className='rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3'>
          <div className='flex items-center justify-between mb-2'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Yangi QR buyurtmalar</p>
              <p className='text-xs text-slate-500'>Mijoz yuborgan buyurtmalar tasdiq kutmoqda</p>
            </div>
            <Badge variant='secondary' size='sm'>
              {inbox?.pendingOrders.length}
            </Badge>
          </div>

          <div className='space-y-2'>
            {inbox?.pendingOrders.map((request) => (
              <div key={request.id} className='rounded-xl bg-white border border-indigo-100 p-3'>
                <div className='flex items-start justify-between gap-3 mb-2'>
                  <div>
                    <p className='text-sm font-semibold text-slate-900'>Kod: {request.publicCode}</p>
                    <p className='text-xs text-slate-500'>
                      {request.itemCount} ta mahsulot, {formatCurrency(request.subtotalAmount)}
                    </p>
                  </div>
                  <Badge variant='warning' size='sm'>
                    Kutilmoqda
                  </Badge>
                </div>
                {request.items && request.items.length > 0 && (
                  <div className='space-y-1.5 mb-3'>
                    {request.items.map((item) => (
                      <div key={item.id} className='flex items-center justify-between gap-2 text-xs text-slate-600'>
                        <span className='truncate'>
                          {item.productName}
                          {item.portionLabel ? ` · ${item.portionLabel}` : ''}
                        </span>
                        <span className='font-medium text-slate-800'>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
                {request.note && <p className='text-xs text-amber-700 mb-3'>Izoh: {request.note}</p>}
                {canHandleActions && (
                  <div className='flex gap-2'>
                    <Button
                      className='flex-1 h-9 text-xs'
                      isLoading={busyKey === `accept:${request.id}`}
                      onClick={() => onAcceptOrder(request.id)}
                    >
                      Qabul qilish
                    </Button>
                    <Button
                      variant='secondary'
                      className='flex-1 h-9 text-xs'
                      isLoading={busyKey === `reject:${request.id}`}
                      onClick={() => onRejectOrder(request.id)}
                    >
                      Rad etish
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasServiceCalls && (
        <section className='rounded-2xl border border-amber-200 bg-amber-50/70 p-3'>
          <div className='flex items-center justify-between mb-2'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Girgitton chaqiruvlari</p>
              <p className='text-xs text-slate-500'>Stoldan kelgan xizmat chaqiruvlari</p>
            </div>
            <Badge variant='warning' size='sm'>
              {inbox?.activeServiceRequests.length}
            </Badge>
          </div>
          <div className='space-y-2'>
            {inbox?.activeServiceRequests.map((request) => {
              const acknowledged = request.status === 'ACKNOWLEDGED';
              return (
                <div key={request.id} className='rounded-xl bg-white border border-amber-100 p-3'>
                  <div className='flex items-start justify-between gap-3 mb-2'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Chaqiruv: {request.publicCode}</p>
                      <p className='text-xs text-slate-500'>
                        {acknowledged ? 'Qabul qilingan' : 'Yangi chaqiruv'}
                      </p>
                    </div>
                    <Badge variant={acknowledged ? 'secondary' : 'warning'} size='sm'>
                      {acknowledged ? 'Qabul qilingan' : 'Kutilmoqda'}
                    </Badge>
                  </div>
                  {request.note && <p className='text-xs text-slate-600 mb-3'>Izoh: {request.note}</p>}
                  {canHandleActions && (
                    <div className='flex gap-2'>
                      {!acknowledged && (
                        <Button
                          className='flex-1 h-9 text-xs'
                          isLoading={busyKey === `ack:${request.id}`}
                          onClick={() => onAcknowledgeCall(request.id)}
                        >
                          Qabul qildim
                        </Button>
                      )}
                      <Button
                        variant='secondary'
                        className='flex-1 h-9 text-xs'
                        isLoading={busyKey === `complete:${request.id}`}
                        onClick={() => onCompleteCall(request.id)}
                      >
                        Bajarildi
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasQrItems && (
        <section className='rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3'>
          <div className='flex items-center justify-between mb-2'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>QR buyurtma holatlari</p>
              <p className='text-xs text-slate-500'>Qabul qilingan mijoz buyurtmalarining bajarilish bosqichi</p>
            </div>
            <Badge variant='success' size='sm'>
              {qrItems.length}
            </Badge>
          </div>
          <div className='space-y-2'>
            {qrItems.map((item) => {
              const status = item.fulfillmentStatus ?? 'ACCEPTED';
              const nextLabel = nextActionLabel[status];
              return (
                <div key={item.id} className='rounded-xl bg-white border border-emerald-100 p-3 flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-slate-900 truncate'>{item.productName}</p>
                    <p className='text-xs text-slate-500'>Miqdor: {item.quantity}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant={statusVariant(status)} size='sm'>
                      {fulfillmentLabel[status]}
                    </Badge>
                    {canHandleActions && nextLabel && (
                      <Button
                        className='h-9 text-xs px-3'
                        isLoading={busyKey === `item:${item.id}`}
                        onClick={() => onAdvanceItemStatus(item)}
                      >
                        {nextLabel}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
