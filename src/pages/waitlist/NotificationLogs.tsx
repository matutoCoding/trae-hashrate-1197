import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, EmptyState } from '@/components/UI';
import { Bell, Search, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function NotificationLogs() {
  const notifications = useAppStore(s => s.notifications);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let result = [...notifications];
    if (search) {
      result = result.filter(n =>
        n.customerName.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(n => n.status === statusFilter);
    }
    return result.sort((a, b) => parseISO(b.sentAt).getTime() - parseISO(a.sentAt).getTime());
  }, [notifications, search, statusFilter]);

  const stats = useMemo(() => ({
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    delivered: notifications.filter(n => n.status === 'delivered').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    today: notifications.filter(n => format(parseISO(n.sentAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length,
  }), [notifications]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'sent': return { label: '已发送', type: 'info' as const, icon: <Bell size={14} /> };
      case 'delivered': return { label: '已送达', type: 'success' as const, icon: <CheckCircle size={14} /> };
      case 'failed': return { label: '失败', type: 'danger' as const, icon: <XCircle size={14} /> };
      default: return { label: status, type: 'info' as const, icon: <Bell size={14} /> };
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'sms': return '短信';
      case 'email': return '邮件';
      case 'system': return '系统';
      default: return method;
    }
  };

  return (
    <div>
      <PageHeader
        title="补位通知日志"
        subtitle="查看候补补位通知发送记录与状态"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总通知数</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-info">{stats.today}</div>
          <div className="stat-label">今日发送</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-info">{stats.sent}</div>
          <div className="stat-label">已发送</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-success">{stats.delivered}</div>
          <div className="stat-label">已送达</div>
        </div>
        <div className="card-industrial-sm p-4 text-center col-span-2 md:col-span-1">
          <div className="stat-value text-industrial-danger">{stats.failed}</div>
          <div className="stat-label">发送失败</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card-industrial-sm p-5">
          <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} /> 通知趋势
          </h3>
          <div className="h-48 flex items-end gap-2">
            {(() => {
              const days = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = format(d, 'yyyy-MM-dd');
                const count = notifications.filter(n => format(parseISO(n.sentAt), 'yyyy-MM-dd') === dateStr).length;
                days.push({ date: format(d, 'MM-dd'), count, dayName: format(d, 'EEE') });
              }
              const maxCount = Math.max(...days.map(d => d.count), 1);
              return days.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end h-36">
                    <div
                      className="w-full bg-industrial-peak border-2 border-steel-900 transition-all"
                      style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '8px' : '0' }}
                      title={`${d.count} 条通知`}
                    />
                  </div>
                  <div className="font-mono text-xs text-steel-500">{d.dayName}</div>
                  <div className="font-display font-bold text-sm text-steel-900">{d.count}</div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="card-industrial-sm p-5">
          <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-4 flex items-center gap-2">
            <Users size={20} /> 通知方式统计
          </h3>
          <div className="space-y-4">
            {(['system', 'sms', 'email'] as const).map(method => {
              const count = notifications.filter(n => n.method === method).length;
              const percent = notifications.length > 0 ? Math.round((count / notifications.length) * 100) : 0;
              return (
                <div key={method}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-sm text-steel-700">{getMethodLabel(method)}</span>
                    <span className="font-display font-bold text-sm text-steel-900">{count} ({percent}%)</span>
                  </div>
                  <div className="h-4 bg-steel-100 border-2 border-steel-900 overflow-hidden">
                    <div
                      className={`h-full ${method === 'system' ? 'bg-industrial-info' : method === 'sms' ? 'bg-industrial-peak' : 'bg-industrial-normal'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card-industrial-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              className="input-industrial pl-10"
              placeholder="搜索客户或消息内容..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <select
            className="input-industrial !w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="sent">已发送</option>
            <option value="delivered">已送达</option>
            <option value="failed">失败</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={48} />}
          title="暂无通知记录"
          description="当脚手架释放并触发候补补位时会生成通知记录"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const statusInfo = getStatusInfo(notif.status);
            return (
              <div key={notif.id} className="card-industrial-sm p-4 hover:shadow-industrial transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-steel-900 shrink-0 ${
                    notif.status === 'delivered' ? 'bg-industrial-success text-white' :
                    notif.status === 'failed' ? 'bg-industrial-danger text-white' :
                    'bg-industrial-info text-white'
                  }`}>
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-display font-bold text-steel-900">
                          {notif.customerName}
                          <span className="ml-2 font-mono text-xs text-steel-500">{notif.scaffoldType} × {notif.quantity}套</span>
                        </div>
                        <div className="font-mono text-xs text-steel-500 mt-0.5">
                          {format(parseISO(notif.sentAt), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag type={statusInfo.type}>
                          <span className="flex items-center gap-1">{statusInfo.icon} {statusInfo.label}</span>
                        </Tag>
                        <Tag type="info">{getMethodLabel(notif.method)}</Tag>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-steel-50 border-2 border-steel-200 font-mono text-sm text-steel-700">
                      {notif.message}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
