import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, Modal } from '@/components/UI';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, User, Building2, AlertCircle } from 'lucide-react';
import { addDays, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO, addHours, isBefore } from 'date-fns';
import { RentalOrder, RentalStatus, Scaffold } from '@/types';
import { calculateRentalFee } from '@/services/billingService';
import { getDynamicScaffoldStatus, hasScheduleConflict } from '@/services/scheduleService';

const statusLabel: Record<RentalStatus, string> = {
  pending: '待开始',
  active: '进行中',
  completed: '已完成',
  overdue: '已超期',
  released: '已释放',
};

const statusColor: Record<RentalStatus, 'info' | 'success' | 'peak' | 'danger' | 'warning'> = {
  pending: 'info',
  active: 'success',
  completed: 'success',
  overdue: 'danger',
  released: 'warning',
};

export default function ScheduleCalendar() {
  const scaffolds = useAppStore(s => s.scaffolds);
  const rentalOrders = useAppStore(s => s.rentalOrders);
  const rateRules = useAppStore(s => s.rateRules);
  const activeRuleId = useAppStore(s => s.activeRuleId);
  const createRental = useAppStore(s => s.createRental);
  const processAutoRelease = useAppStore(s => s.processAutoRelease);

  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);

  const [formData, setFormData] = useState({
    customerName: '', customerPhone: '', quantity: 1,
    startDate: format(new Date(), 'yyyy-MM-dd'), startTime: '08:00',
    endDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'), endTime: '18:00',
    autoReleaseAfterMinutes: 120,
  });

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  }, [viewMode, currentDate]);

  const navigatePrev = () => {
    setCurrentDate(d => viewMode === 'week' ? addDays(d, -7) : addDays(d, -1));
  };
  const navigateNext = () => {
    setCurrentDate(d => viewMode === 'week' ? addDays(d, 7) : addDays(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const openNewRental = (scaffold?: Scaffold) => {
    setSelectedScaffold(scaffold || null);
    if (scaffold) {
      setFormData(p => ({ ...p }));
    }
    setModalOpen(true);
  };

  const handleCreateRental = () => {
    if (!selectedScaffold || !formData.customerName.trim()) return;
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);
    if (isBefore(end, start)) return;

    if (hasScheduleConflict(selectedScaffold.id, rentalOrders, start, end)) {
      alert('该脚手架在所选时间段已有预约，时间冲突，请选择其他时间或其他脚手架。');
      return;
    }

    createRental({
      scaffoldId: selectedScaffold.id,
      scaffoldCode: selectedScaffold.code,
      scaffoldType: selectedScaffold.type,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      startTime: start,
      endTime: end,
      quantity: formData.quantity,
      autoReleaseAfterMinutes: formData.autoReleaseAfterMinutes,
    });
    setModalOpen(false);
  };

  const getOrdersForScaffoldAndDay = (scaffoldId: string, day: Date) => {
    return rentalOrders.filter(o => {
      if (o.scaffoldId !== scaffoldId) return false;
      const orderStart = parseISO(o.startTime);
      const orderEnd = parseISO(o.endTime);
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
      return !(orderEnd < dayStart || orderStart > dayEnd);
    });
  };

  return (
    <div>
      <PageHeader
        title="排期日历"
        subtitle="查看脚手架租赁排期，管理租赁订单"
        actions={
          <div className="flex gap-3">
            <button className="btn-industrial-outline" onClick={() => { const r = processAutoRelease(); console.log(r); }}>
              <span className="flex items-center gap-2"><Clock size={16} /> 执行释放</span>
            </button>
            <button className="btn-industrial-success" onClick={() => openNewRental()}>
              <span className="flex items-center gap-2"><Plus size={16} /> 新建租赁</span>
            </button>
          </div>
        }
      />

      <div className="card-industrial-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex border-2 border-steel-900">
            <button className={`px-4 py-2 font-display font-semibold uppercase tracking-wider text-sm ${viewMode === 'day' ? 'bg-steel-800 text-white' : 'bg-white text-steel-900'}`} onClick={() => setViewMode('day')}>日视图</button>
            <button className={`px-4 py-2 font-display font-semibold uppercase tracking-wider text-sm ${viewMode === 'week' ? 'bg-steel-800 text-white' : 'bg-white text-steel-900'}`} onClick={() => setViewMode('week')}>周视图</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border-2 border-steel-900 hover:bg-steel-100" onClick={navigatePrev}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn-industrial-outline !py-1.5 !px-3 !text-xs" onClick={goToday}>今天</button>
            <button className="p-2 border-2 border-steel-900 hover:bg-steel-100" onClick={navigateNext}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 flex items-center gap-2">
          <Calendar size={20} />
          {viewMode === 'week'
            ? `${format(days[0], 'yyyy年MM月dd日')} - ${format(days[days.length - 1], 'MM月dd日')}`
            : format(days[0], 'yyyy年MM月dd日 EEEE')
          }
        </div>
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid bg-steel-800 text-white" style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}>
              <div className="p-3 font-display font-semibold uppercase tracking-wider text-sm border-r-2 border-steel-900">脚手架</div>
              {days.map(day => (
                <div key={day.toISOString()} className={`p-3 text-center border-r-2 border-steel-900 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-industrial-peak/30' : ''}`}>
                  <div className="font-display font-bold text-sm uppercase tracking-wider">{format(day, 'EEE')}</div>
                  <div className="font-mono text-xs mt-0.5">{format(day, 'MM/dd')}</div>
                </div>
              ))}
            </div>

            {scaffolds.map(scaffold => {
              const dynStatus = getDynamicScaffoldStatus(scaffold, rentalOrders);
              return (
              <div key={scaffold.id} className="grid border-t-2 border-steel-200 hover:bg-steel-50" style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}>
                <div className="p-3 border-r-2 border-steel-200 bg-white">
                  <div className="font-mono text-xs text-steel-500">{scaffold.code}</div>
                  <div className="font-display font-semibold text-sm text-steel-900 truncate">{scaffold.type}</div>
                  <Tag type={dynStatus === 'available' ? 'success' : dynStatus === 'rented' ? 'peak' : 'warning'} className="mt-1">
                    {dynStatus === 'available' ? '空闲' : dynStatus === 'rented' ? '租赁中' : '维修'}
                  </Tag>
                </div>

                {days.map(day => {
                  const orders = getOrdersForScaffoldAndDay(scaffold.id, day);
                  return (
                    <div key={day.toISOString()} className="p-1 border-r-2 border-steel-200 last:border-r-0 min-h-[80px] relative">
                      {scaffold.status !== 'maintenance' && (
                        <button
                          onClick={() => openNewRental(scaffold)}
                          className="absolute inset-1 border-2 border-dashed border-steel-300 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-white/80"
                        >
                          <Plus size={16} className="text-steel-500" />
                        </button>
                      )}
                      {orders.map(order => {
                        const orderStart = parseISO(order.startTime);
                        const orderEnd = parseISO(order.endTime);
                        return (
                          <div
                            key={order.id}
                            className={`p-2 mb-1 border-2 border-steel-900 ${order.status === 'overdue' ? 'bg-industrial-danger text-white' : order.status === 'released' ? 'bg-industrial-warning/20' : 'bg-industrial-peak text-white'}`}
                          >
                            <div className="font-mono text-xs truncate">{order.customerName}</div>
                            <div className="font-mono text-[10px] opacity-80">
                              {format(orderStart, 'HH:mm')}-{format(orderEnd, 'HH:mm')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 card-industrial-sm p-4">
        <h4 className="font-display font-semibold uppercase tracking-wider text-sm text-steel-900 mb-3">状态图例</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><Tag type="success">空闲</Tag><span className="font-mono text-xs text-steel-500">可租用</span></div>
          <div className="flex items-center gap-2"><div className="px-2 py-0.5 bg-industrial-peak text-white border-2 border-steel-900 font-display text-xs font-bold uppercase">进行中</div><span className="font-mono text-xs text-steel-500">正常租赁</span></div>
          <div className="flex items-center gap-2"><Tag type="danger">已超期</Tag><span className="font-mono text-xs text-steel-500">待释放</span></div>
          <div className="flex items-center gap-2"><Tag type="warning">已释放</Tag><span className="font-mono text-xs text-steel-500">超时释放</span></div>
          <div className="flex items-center gap-2"><Tag type="warning">维修中</Tag><span className="font-mono text-xs text-steel-500">不可用</span></div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新建租赁订单"
        footer={
          <>
            <button className="btn-industrial-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-industrial" onClick={handleCreateRental}>创建</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-industrial">选择脚手架</label>
            <select
              className="input-industrial"
              value={selectedScaffold?.id || ''}
              onChange={e => setSelectedScaffold(scaffolds.find(s => s.id === e.target.value) || null)}
            >
              <option value="">请选择脚手架</option>
              {scaffolds.filter(s => s.status !== 'maintenance').map(s => {
                const dyn = getDynamicScaffoldStatus(s, rentalOrders);
                return <option key={s.id} value={s.id}>{s.code} - {s.type} ({s.poleCount}根, {dyn === 'available' ? '空闲' : dyn === 'rented' ? '当前占用' : '维修'})</option>;
              })}
            </select>
          </div>
          <div>
            <label className="label-industrial">客户名称</label>
            <input className="input-industrial" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} />
          </div>
          <div>
            <label className="label-industrial">联系电话</label>
            <input className="input-industrial" value={formData.customerPhone} onChange={e => setFormData(p => ({ ...p, customerPhone: e.target.value }))} />
          </div>
          <div>
            <label className="label-industrial">租用开始时间</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="input-industrial" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
              <input type="time" className="input-industrial" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-industrial">租用结束时间</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="input-industrial" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} />
              <input type="time" className="input-industrial" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-industrial">数量</label>
              <input type="number" min={1} className="input-industrial" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label-industrial">超时释放(分钟)</label>
              <input type="number" min={0} className="input-industrial" value={formData.autoReleaseAfterMinutes} onChange={e => setFormData(p => ({ ...p, autoReleaseAfterMinutes: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
