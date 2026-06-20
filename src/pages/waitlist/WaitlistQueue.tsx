import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, Modal, EmptyState } from '@/components/UI';
import { Plus, CheckCircle, XCircle, ListTodo, User, Phone, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { WaitlistEntry, WaitlistStatus } from '@/types';
import { format, parseISO, differenceInMinutes } from 'date-fns';

const statusLabel: Record<WaitlistStatus, string> = {
  waiting: '等待中',
  notified: '已通知',
  confirmed: '已确认',
  expired: '已过期',
  cancelled: '已取消',
};

const statusType: Record<WaitlistStatus, 'info' | 'warning' | 'success' | 'danger' | 'valley'> = {
  waiting: 'info',
  notified: 'warning',
  confirmed: 'success',
  expired: 'danger',
  cancelled: 'valley',
};

const priorities = [
  { value: 1, label: '普通', color: 'text-steel-500' },
  { value: 2, label: '优先', color: 'text-industrial-info' },
  { value: 3, label: '紧急', color: 'text-industrial-danger' },
];

export default function WaitlistQueue() {
  const waitlist = useAppStore(s => s.waitlist);
  const addWaitlistEntry = useAppStore(s => s.addWaitlistEntry);
  const confirmWaitlist = useAppStore(s => s.confirmWaitlist);
  const cancelWaitlist = useAppStore(s => s.cancelWaitlist);
  const processWaitlistNotification = useAppStore(s => s.processWaitlistNotification);
  const expireNotified = useAppStore(s => s.processAutoRelease);

  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('all');
  const [formData, setFormData] = useState({
    customerName: '', phone: '', scaffoldType: '门式脚手架', quantity: 1, priority: 1, notes: ''
  });

  const types = useMemo(() => {
    const set = new Set(waitlist.map(w => w.scaffoldType));
    return Array.from(set);
  }, [waitlist]);

  const sortedWaitlist = useMemo(() => {
    let result = [...waitlist];
    if (typeFilter !== 'all') {
      result = result.filter(w => w.scaffoldType === typeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter);
    }
    return result.sort((a, b) => {
      const activeA = a.status === 'waiting' || a.status === 'notified';
      const activeB = b.status === 'waiting' || b.status === 'notified';
      if (activeA !== activeB) return activeA ? -1 : 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
    });
  }, [waitlist, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const waiting = waitlist.filter(w => w.status === 'waiting').length;
    const notified = waitlist.filter(w => w.status === 'notified').length;
    const confirmed = waitlist.filter(w => w.status === 'confirmed').length;
    const expired = waitlist.filter(w => w.status === 'expired' || w.status === 'cancelled').length;
    const byType = new Map<string, number>();
    waitlist.filter(w => w.status === 'waiting').forEach(w => {
      byType.set(w.scaffoldType, (byType.get(w.scaffoldType) || 0) + 1);
    });
    return { waiting, notified, confirmed, expired, byType: Array.from(byType.entries()) };
  }, [waitlist]);

  const handleAdd = () => {
    if (!formData.customerName.trim()) return;
    addWaitlistEntry(formData);
    setModalOpen(false);
    setFormData({ customerName: '', phone: '', scaffoldType: '门式脚手架', quantity: 1, priority: 1, notes: '' });
  };

  const getPriorityLabel = (p: number) => priorities.find(pr => pr.value === p)?.label || '普通';
  const getPriorityColor = (p: number) => priorities.find(pr => pr.value === p)?.color || 'text-steel-500';

  const getWaitingTime = (entry: WaitlistEntry) => {
    const minutes = differenceInMinutes(new Date(), parseISO(entry.createdAt));
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const remainMins = minutes % 60;
    if (hours < 24) return `${hours}小时${remainMins > 0 ? remainMins + '分' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days}天${hours % 24 > 0 ? (hours % 24) + '小时' : ''}`;
  };

  const getTimeRemaining = (entry: WaitlistEntry) => {
    if (entry.status !== 'notified' || !entry.notifiedAt) return null;
    const elapsed = differenceInMinutes(new Date(), parseISO(entry.notifiedAt));
    const remaining = Math.max(0, 30 - elapsed);
    return remaining;
  };

  return (
    <div>
      <PageHeader
        title="候补队列"
        subtitle="管理脚手架候补登记，自动补位通知"
        actions={<button className="btn-industrial-success" onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-2"><Plus size={16} /> 登记候补</span>
        </button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-info">{stats.waiting}</div>
          <div className="stat-label">等待中</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-warning">{stats.notified}</div>
          <div className="stat-label">已通知待确认</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-success">{stats.confirmed}</div>
          <div className="stat-label">已确认补位</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-danger">{stats.expired}</div>
          <div className="stat-label">已过期/取消</div>
        </div>
      </div>

      {stats.byType.length > 0 && (
        <div className="card-industrial-sm p-4 mb-6">
          <h4 className="font-display font-semibold uppercase tracking-wider text-sm text-steel-900 mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> 按类型候补数量
          </h4>
          <div className="flex flex-wrap gap-4">
            {stats.byType.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 px-3 py-2 bg-steel-50 border-2 border-steel-900">
                <span className="font-mono text-sm text-steel-700">{type}</span>
                <span className="font-display font-bold text-industrial-peak">{count} 人</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-industrial-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="label-industrial">脚手架类型</label>
          <select className="input-industrial !w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">全部类型</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label-industrial">状态</label>
          <select className="input-industrial !w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="all">全部状态</option>
            <option value="waiting">等待中</option>
            <option value="notified">已通知</option>
            <option value="confirmed">已确认</option>
            <option value="expired">已过期</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <button className="btn-industrial-outline" onClick={() => expireNotified()}>
          <span className="flex items-center gap-2"><Clock size={16} /> 检查超时</span>
        </button>
      </div>

      {sortedWaitlist.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={48} />}
          title="暂无候补记录"
          description="点击右上角按钮登记新的候补客户"
        />
      ) : (
        <div className="space-y-3">
          {sortedWaitlist.map((entry, index) => {
            const remaining = getTimeRemaining(entry);
            return (
              <div key={entry.id} className="card-industrial p-4 hover:shadow-industrial-lg transition-all relative">
                {(entry.status === 'waiting' || entry.status === 'notified') && (
                  <div className="absolute -top-2 -left-2 w-10 h-10 bg-industrial-peak text-white rounded-full flex items-center justify-center font-display font-bold border-2 border-steel-900 shadow-industrial-sm">
                    #{index + 1}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pl-12 md:pl-14">
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className="text-steel-500" />
                      <span className="font-display font-bold text-steel-900">{entry.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-steel-500">
                      <Phone size={12} />
                      {entry.phone || '未留电话'}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="font-mono text-xs text-steel-500">脚手架类型</div>
                    <div className="font-display font-semibold text-steel-900">{entry.scaffoldType}</div>
                    <div className="font-mono text-xs text-steel-500 mt-1">数量：{entry.quantity} 套</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="font-mono text-xs text-steel-500">优先级</div>
                    <div className={`font-display font-bold ${getPriorityColor(entry.priority)}`}>
                      {getPriorityLabel(entry.priority)}
                    </div>
                    <div className="font-mono text-xs text-steel-500 mt-1">
                      已等待：{getWaitingTime(entry)}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col items-start gap-2">
                    <Tag type={statusType[entry.status]}>{statusLabel[entry.status]}</Tag>
                    {remaining !== null && (
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <AlertTriangle size={12} className={remaining <= 5 ? 'text-industrial-danger' : 'text-industrial-warning'} />
                        <span className={remaining <= 5 ? 'text-industrial-danger font-bold' : 'text-industrial-warning'}>
                          剩余 {remaining} 分钟
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 flex gap-2 justify-end">
                    {entry.status === 'waiting' && (
                      <button
                        className="btn-industrial !py-1 !px-3 !text-xs"
                        onClick={() => processWaitlistNotification(entry.scaffoldType, entry.quantity)}
                        title="发送补位通知"
                      >
                        <span className="flex items-center gap-1"><AlertTriangle size={12} /> 通知</span>
                      </button>
                    )}
                    {entry.status === 'notified' && (
                      <button
                        className="btn-industrial-success !py-1 !px-3 !text-xs"
                        onClick={() => confirmWaitlist(entry.id)}
                        title="确认补位"
                      >
                        <span className="flex items-center gap-1"><CheckCircle size={12} /> 确认</span>
                      </button>
                    )}
                    {(entry.status === 'waiting' || entry.status === 'notified') && (
                      <button
                        className="btn-industrial-danger !py-1 !px-3 !text-xs"
                        onClick={() => { if (confirm('确定取消该候补？')) cancelWaitlist(entry.id); }}
                        title="取消候补"
                      >
                        <XCircle size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {entry.notes && (
                  <div className="mt-3 ml-12 md:ml-14 p-2 bg-steel-50 border-l-4 border-steel-400 font-mono text-xs text-steel-600 italic">
                    备注：{entry.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="登记候补客户"
        footer={
          <>
            <button className="btn-industrial-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-industrial" onClick={handleAdd}>登记</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-industrial">客户名称</label>
            <input className="input-industrial" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="必填" />
          </div>
          <div>
            <label className="label-industrial">联系电话</label>
            <input className="input-industrial" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-industrial">脚手架类型</label>
              <select className="input-industrial" value={formData.scaffoldType} onChange={e => setFormData(p => ({ ...p, scaffoldType: e.target.value }))}>
                <option>门式脚手架</option>
                <option>碗扣式脚手架</option>
                <option>扣件式钢管脚手架</option>
                <option>盘扣式脚手架</option>
              </select>
            </div>
            <div>
              <label className="label-industrial">数量（套）</label>
              <input type="number" min={1} className="input-industrial" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="label-industrial">优先级</label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map(p => (
                <button
                  key={p.value}
                  className={`py-2 font-display font-semibold uppercase tracking-wider text-sm border-2 border-steel-900 ${
                    formData.priority === p.value ? 'bg-steel-800 text-white' : 'bg-white text-steel-900 hover:bg-steel-100'
                  }`}
                  onClick={() => setFormData(pd => ({ ...pd, priority: p.value }))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-industrial">备注</label>
            <textarea className="input-industrial !h-20 resize-none" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="可选" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
