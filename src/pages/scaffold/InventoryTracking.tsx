import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, EmptyState } from '@/components/UI';
import { Package, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, AlertTriangle, CheckCircle, Clock, User, Building2 } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { RentalOrder, InventoryLog, InventorySource } from '@/types';
import { formatCurrency } from '@/services/billingService';
import { processStatusTransitions } from '@/services/scheduleService';

const sourceLabel: Record<InventorySource, { text: string; type: 'info' | 'success' | 'peak' | 'warning' }> = {
  manual: { text: '人工盘点', type: 'info' },
  rental_out: { text: '租赁出库', type: 'peak' },
  rental_in: { text: '归还入库', type: 'success' },
  auto_release: { text: '超时释放', type: 'warning' },
};

interface OrderTrackingInfo {
  order: RentalOrder;
  logs: InventoryLog[];
  setsQuantity: number;
  poleExpectedOut: number;
  poleActualOut: number;
  poleExpectedIn: number;
  poleActualIn: number;
  diff: number;
  status: 'normal' | 'missing_out' | 'missing_in' | 'mismatch' | 'completed';
}

export default function InventoryTracking() {
  const rentalOrders = useAppStore(s => s.rentalOrders);
  const inventoryLogs = useAppStore(s => s.inventoryLogs);
  const scaffolds = useAppStore(s => s.scaffolds);
  const processAutoRelease = useAppStore(s => s.processAutoRelease);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'missing_out' | 'missing_in' | 'mismatch' | 'completed'>('all');

  useEffect(() => {
    processAutoRelease();
  }, []);

  const orderTracking = useMemo<OrderTrackingInfo[]>(() => {
    return rentalOrders.map(order => {
      const scaffold = scaffolds.find(s => s.id === order.scaffoldId);
      const logs = inventoryLogs.filter(l => l.relatedOrderId === order.id);
      const outLogs = logs.filter(l => l.source === 'rental_out');
      const inLogs = logs.filter(l => l.source === 'rental_in' || l.source === 'auto_release');

      const setsQuantity = order.quantity;
      const poleExpectedOut = scaffold ? scaffold.poleCount * setsQuantity : setsQuantity;
      const poleActualOut = outLogs.reduce((sum, l) => sum + Math.abs(l.poleChange), 0);
      const poleExpectedIn = poleActualOut > 0 ? poleActualOut : poleExpectedOut;
      const poleActualIn = inLogs.reduce((sum, l) => sum + Math.abs(l.poleChange), 0);
      const diff = poleActualIn - poleExpectedIn;

      let status: OrderTrackingInfo['status'] = 'normal';
      const hasOut = outLogs.length > 0 && poleActualOut > 0;
      const hasIn = inLogs.length > 0 && poleActualIn > 0;
      const isOrderComplete = order.status === 'completed' || order.status === 'released';

      if (isOrderComplete && Math.abs(diff) === 0 && hasOut) {
        status = 'completed';
      } else if (!hasOut) {
        status = 'missing_out';
      } else if (isOrderComplete && !hasIn) {
        status = 'missing_in';
      } else if (hasIn && Math.abs(diff) > 0) {
        status = 'mismatch';
      } else {
        status = 'normal';
      }

      return {
        order,
        logs,
        setsQuantity,
        poleExpectedOut,
        poleActualOut,
        poleExpectedIn,
        poleActualIn,
        diff,
        status,
      };
    })
      .sort((a, b) => parseISO(b.order.createdAt).getTime() - parseISO(a.order.createdAt).getTime());
  }, [rentalOrders, inventoryLogs, scaffolds]);

  const filteredTracking = useMemo(() => {
    return orderTracking.filter(t => {
      const matchSearch = t.order.customerName.toLowerCase().includes(search.toLowerCase()) ||
        t.order.scaffoldCode.toLowerCase().includes(search.toLowerCase()) ||
        t.order.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orderTracking, search, statusFilter]);

  const stats = useMemo(() => {
    const total = orderTracking.length;
    const completed = orderTracking.filter(t => t.status === 'completed').length;
    const normal = orderTracking.filter(t => t.status === 'normal').length;
    const missingOut = orderTracking.filter(t => t.status === 'missing_out').length;
    const missingIn = orderTracking.filter(t => t.status === 'missing_in').length;
    const mismatch = orderTracking.filter(t => t.status === 'mismatch').length;
    const totalDiff = orderTracking.reduce((sum, t) => sum + t.diff, 0);
    return { total, completed, normal, missingOut, missingIn, mismatch, totalDiff };
  }, [orderTracking]);

  const getStatusDisplay = (status: OrderTrackingInfo['status']) => {
    const map = {
      completed: { label: '已完成', type: 'success' as const, icon: CheckCircle },
      normal: { label: '进行中', type: 'info' as const, icon: Clock },
      missing_out: { label: '未出库', type: 'danger' as const, icon: AlertTriangle },
      missing_in: { label: '未归还', type: 'warning' as const, icon: AlertTriangle },
      mismatch: { label: '数量不符', type: 'danger' as const, icon: AlertTriangle },
    };
    return map[status];
  };

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="订单出入库追踪"
        subtitle="按订单维度查看取架、归还、超时释放的流水记录，追踪数量差异"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="card-industrial p-4">
          <div className="font-mono text-xs text-steel-500">总订单数</div>
          <div className="font-display font-bold text-2xl text-steel-900">{stats.total}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="font-mono text-xs text-steel-500">已完成</div>
          <div className="font-display font-bold text-2xl text-industrial-success">{stats.completed}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="font-mono text-xs text-steel-500">进行中</div>
          <div className="font-display font-bold text-2xl text-industrial-info">{stats.normal}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="font-mono text-xs text-steel-500">未出库</div>
          <div className="font-display font-bold text-2xl text-industrial-danger">{stats.missingOut}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="font-mono text-xs text-steel-500">未归还</div>
          <div className="font-display font-bold text-2xl text-industrial-warning">{stats.missingIn}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="font-mono text-xs text-steel-500">数量差异</div>
          <div className={`font-display font-bold text-2xl ${stats.totalDiff > 0 ? 'text-industrial-success' : stats.totalDiff < 0 ? 'text-industrial-danger' : 'text-steel-900'}`}>
            {stats.totalDiff > 0 ? '+' : ''}{stats.totalDiff}
          </div>
        </div>
      </div>

      <div className="card-industrial p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            className="input-industrial pl-10"
            placeholder="搜索客户、脚手架编号、订单号..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'normal', 'completed', 'missing_out', 'missing_in', 'mismatch'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 border-2 border-steel-900 font-mono text-xs transition-colors ${
                statusFilter === s ? 'bg-steel-800 text-white' : 'bg-white hover:bg-steel-100'
              }`}
            >
              {s === 'all' ? '全部' :
               s === 'normal' ? '进行中' :
               s === 'completed' ? '已完成' :
               s === 'missing_out' ? '未出库' :
               s === 'missing_in' ? '未归还' : '数量不符'}
            </button>
          ))}
        </div>
      </div>

      {filteredTracking.length === 0 ? (
        <EmptyState title="暂无追踪记录" description="修改筛选条件或创建新订单后查看" />
      ) : (
        <div className="space-y-4">
          {filteredTracking.map(tracking => {
            const statusDisp = getStatusDisplay(tracking.status);
            const StatusIcon = statusDisp.icon;
            const isExpanded = expandedOrder === tracking.order.id;

            return (
              <div key={tracking.order.id} className="card-industrial overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-steel-50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : tracking.order.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} className={`text-industrial-${statusDisp.type}`} />
                          <Tag type={statusDisp.type}>{statusDisp.label}</Tag>
                        </div>
                        <span className="font-mono text-xs text-steel-500">订单 {tracking.order.id}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-steel-500" />
                        <span className="font-display font-semibold text-steel-900">{tracking.order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Building2 size={14} className="text-steel-500" />
                          <span className="font-mono text-xs">{tracking.order.scaffoldCode} · {tracking.order.scaffoldType}</span>
                        </div>
                        <div className="font-mono text-xs text-industrial-info">
                          {tracking.setsQuantity}套 · 单套{tracking.poleExpectedOut / tracking.setsQuantity}根
                        </div>
                        <div className="font-mono text-xs text-steel-500">
                          计划：{format(parseISO(tracking.order.startTime), 'MM-dd HH:mm')} ~ {format(parseISO(tracking.order.endTime), 'MM-dd HH:mm')}
                        </div>
                        {tracking.order.actualStartTime && (
                          <div className="font-mono text-xs text-industrial-success">
                            取架：{format(parseISO(tracking.order.actualStartTime), 'MM-dd HH:mm')}
                          </div>
                        )}
                        {tracking.order.actualEndTime && (
                          <div className="font-mono text-xs text-industrial-danger">
                            归还：{format(parseISO(tracking.order.actualEndTime), 'MM-dd HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <div className="font-mono text-xs text-steel-500">应出(根)</div>
                        <div className="font-display font-bold text-industrial-peak">{tracking.poleExpectedOut}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-xs text-steel-500">实出(根)</div>
                        <div className={`font-display font-bold ${tracking.poleActualOut === tracking.poleExpectedOut ? 'text-industrial-success' : 'text-industrial-danger'}`}>
                          {tracking.poleActualOut}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-xs text-steel-500">应入(根)</div>
                        <div className="font-display font-bold text-industrial-info">{tracking.poleExpectedIn}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-xs text-steel-500">实入(根)</div>
                        <div className={`font-display font-bold ${tracking.poleActualIn === tracking.poleExpectedIn ? 'text-industrial-success' : 'text-industrial-danger'}`}>
                          {tracking.poleActualIn}
                        </div>
                      </div>
                      <div className="text-center border-l-2 border-steel-200 pl-6">
                        <div className="font-mono text-xs text-steel-500">差异</div>
                        <div className={`font-display font-bold text-xl ${
                          tracking.diff > 0 ? 'text-industrial-success' :
                          tracking.diff < 0 ? 'text-industrial-danger' : 'text-steel-900'
                        }`}>
                          {tracking.diff > 0 ? '+' : ''}{tracking.diff}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t-2 border-steel-200 bg-steel-50">
                    <div className="bg-steel-800 text-white px-5 py-3 flex items-center justify-between">
                      <h4 className="font-display font-bold uppercase tracking-wider text-sm">出入库流水</h4>
                      <span className="font-mono text-xs text-steel-300">共 {tracking.logs.length} 条记录</span>
                    </div>
                    {tracking.logs.length === 0 ? (
                      <div className="p-6 text-center font-mono text-sm text-steel-500">暂无出入库记录</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table-industrial">
                          <thead>
                            <tr>
                              <th>时间</th>
                              <th>来源</th>
                              <th>操作</th>
                              <th>变动数量</th>
                              <th>操作后数量</th>
                              <th>操作员</th>
                              <th>备注</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tracking.logs
                              .sort((a, b) => parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime())
                              .map(log => {
                                const src = sourceLabel[log.source];
                                return (
                                  <tr key={log.id}>
                                    <td className="font-mono text-xs">{format(parseISO(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}</td>
                                    <td>
                                      <Tag type={src.type}>{src.text}</Tag>
                                    </td>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        {log.action === 'in' ? <ArrowDownCircle size={16} className="text-industrial-success" /> :
                                         log.action === 'out' ? <ArrowUpCircle size={16} className="text-industrial-danger" /> :
                                         <ArrowRightLeft size={16} className="text-industrial-info" />}
                                        <span className="font-mono text-xs">
                                          {log.action === 'in' ? '入库' : log.action === 'out' ? '出库' : '调整'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`font-display font-bold ${log.poleChange > 0 ? 'text-industrial-success' : 'text-industrial-danger'}`}>
                                      {log.poleChange > 0 ? '+' : ''}{log.poleChange}
                                    </td>
                                    <td className="font-display font-bold">{log.poleAfter}</td>
                                    <td>{log.operator}</td>
                                    <td className="font-mono text-xs text-steel-500">{log.notes || '-'}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {tracking.order.totalAmount !== undefined && (
                      <div className="border-t-2 border-steel-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card-industrial-sm p-3">
                          <div className="font-mono text-xs text-steel-500">预估费用</div>
                          <div className="font-display font-bold text-lg text-steel-900">
                            {formatCurrency(tracking.order.totalAmount)}
                          </div>
                        </div>
                        {tracking.order.finalAmount !== undefined && (
                          <div className="card-industrial-sm p-3">
                            <div className="font-mono text-xs text-steel-500">实际费用</div>
                            <div className="font-display font-bold text-lg text-industrial-success">
                              {formatCurrency(tracking.order.finalAmount)}
                            </div>
                          </div>
                        )}
                        {tracking.order.finalAmount !== undefined && (
                          <div className="card-industrial-sm p-3">
                            <div className="font-mono text-xs text-steel-500">差额</div>
                            <div className={`font-display font-bold text-lg ${
                              tracking.order.finalAmount > tracking.order.totalAmount ? 'text-industrial-peak' :
                              tracking.order.finalAmount < tracking.order.totalAmount ? 'text-industrial-success' :
                              'text-steel-900'
                            }`}>
                              {tracking.order.finalAmount > tracking.order.totalAmount ? '+' : ''}
                              {formatCurrency(tracking.order.finalAmount - tracking.order.totalAmount)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
