import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, StatCard, Tag } from '@/components/UI';
import {
  Building2, Package, ListTodo, Receipt, Clock, AlertTriangle,
  TrendingUp, Users, ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { parseISO, format, isToday, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { formatCurrency } from '@/services/billingService';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const scaffolds = useAppStore(s => s.scaffolds);
  const rentalOrders = useAppStore(s => s.rentalOrders);
  const waitlist = useAppStore(s => s.waitlist);
  const invoices = useAppStore(s => s.invoices);
  const notifications = useAppStore(s => s.notifications);

  const stats = useMemo(() => {
    const totalScaffolds = scaffolds.length;
    const rentedScaffolds = scaffolds.filter(s => s.status === 'rented').length;
    const availableScaffolds = scaffolds.filter(s => s.status === 'available').length;
    const utilizationRate = totalScaffolds > 0 ? Math.round((rentedScaffolds / totalScaffolds) * 100) : 0;

    const activeOrders = rentalOrders.filter(o => o.status === 'active' || o.status === 'overdue').length;
    const overdueOrders = rentalOrders.filter(o => o.status === 'overdue').length;
    const todayOrders = rentalOrders.filter(o => isToday(parseISO(o.createdAt))).length;

    const waitingCount = waitlist.filter(w => w.status === 'waiting').length;
    const notifiedCount = waitlist.filter(w => w.status === 'notified').length;

    const totalRevenue = invoices.filter(i => i.status === 'paid' || i.status === 'issued')
      .reduce((sum, i) => sum + i.totalAmount, 0);
    const pendingAmount = invoices.filter(i => i.status === 'issued')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const totalPoles = scaffolds.reduce((sum, s) => sum + s.poleCount, 0);

    return {
      totalScaffolds,
      rentedScaffolds,
      availableScaffolds,
      utilizationRate,
      activeOrders,
      overdueOrders,
      todayOrders,
      waitingCount,
      notifiedCount,
      totalRevenue,
      pendingAmount,
      totalPoles,
    };
  }, [scaffolds, rentalOrders, waitlist, invoices]);

  const revenueChartData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayInvoices = invoices.filter(i => {
        const invDate = format(parseISO(i.createdAt), 'yyyy-MM-dd');
        return invDate === dayStr;
      });
      const revenue = dayInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      return {
        name: format(day, 'EEE'),
        revenue: Math.round(revenue * 100) / 100,
        orders: dayInvoices.length,
      };
    });
  }, [invoices]);

  const utilizationData = useMemo(() => {
    const typeMap = new Map<string, { rented: number; total: number }>();
    for (const s of scaffolds) {
      const existing = typeMap.get(s.type) || { rented: 0, total: 0 };
      typeMap.set(s.type, {
        rented: existing.rented + (s.status === 'rented' ? 1 : 0),
        total: existing.total + 1,
      });
    }
    return Array.from(typeMap.entries()).map(([type, data]) => ({
      name: type,
      rented: data.rented,
      available: data.total - data.rented,
    }));
  }, [scaffolds]);

  const todayExpiring = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    return rentalOrders
      .filter(o => {
        const end = parseISO(o.endTime);
        return end >= today && end <= tomorrow && (o.status === 'active' || o.status === 'overdue');
      })
      .slice(0, 5);
  }, [rentalOrders]);

  const recentNotifications = notifications.slice(-5).reverse();

  return (
    <div>
      <PageHeader
        title="仪表盘"
        subtitle="欢迎回来，今日运营数据一览"
        actions={
          <button className="btn-industrial" onClick={() => useAppStore.getState().processAutoRelease()}>
            <span className="flex items-center gap-2">
              <Clock size={16} /> 执行巡检
            </span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="脚手架总数"
          value={stats.totalScaffolds}
          icon={<Building2 size={48} />}
          color="normal"
        />
        <StatCard
          label="租赁中"
          value={`${stats.rentedScaffolds} 套`}
          trend={`${stats.utilizationRate}% 利用率`}
          trendUp={stats.utilizationRate > 60}
          icon={<Package size={48} />}
          color="peak"
        />
        <StatCard
          label="待收租金"
          value={formatCurrency(stats.pendingAmount)}
          icon={<Receipt size={48} />}
          color="warning"
        />
        <StatCard
          label="候补排队"
          value={`${stats.waitingCount} 人`}
          trend={`${stats.notifiedCount} 已通知`}
          trendUp={true}
          icon={<ListTodo size={48} />}
          color="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card-industrial p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900">
              本周收入趋势
            </h3>
            <span className="font-mono text-xs text-steel-500">
              单位：元
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c8d3e0" />
                <XAxis dataKey="name" stroke="#4a6f92" fontFamily="Roboto Mono" fontSize={12} />
                <YAxis stroke="#4a6f92" fontFamily="Roboto Mono" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e3a5f',
                    border: '2px solid #0f1f33',
                    borderRadius: 0,
                    color: 'white',
                    fontFamily: 'Roboto Mono',
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#e67e22"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#e67e22', strokeWidth: 2, stroke: '#0f1f33' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-industrial p-5">
          <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-4">
            类型利用率
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#c8d3e0" />
                <XAxis type="number" stroke="#4a6f92" fontFamily="Roboto Mono" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#4a6f92" fontFamily="Roboto Mono" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e3a5f',
                    border: '2px solid #0f1f33',
                    borderRadius: 0,
                    color: 'white',
                    fontFamily: 'Roboto Mono',
                  }}
                />
                <Bar dataKey="rented" stackId="a" name="租赁中">
                  {utilizationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#e67e22" />
                  ))}
                </Bar>
                <Bar dataKey="available" stackId="a" name="可用">
                  {utilizationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#27ae60" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-industrial p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-industrial-warning" />
              即将到期提醒
            </h3>
            <Link to="/scaffold/schedule" className="font-mono text-xs text-industrial-info hover:underline">
                查看全部 →
              </Link>
          </div>
          {todayExpiring.length === 0 ? (
            <div className="text-center py-8 font-mono text-sm text-steel-500">
              今日无即将到期的租赁订单
            </div>
          ) : (
            <div className="space-y-3">
              {todayExpiring.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-steel-50 border-2 border-steel-900">
                  <div>
                    <div className="font-display font-semibold text-sm text-steel-900">{order.customerName}</div>
                    <div className="font-mono text-xs text-steel-500">
                      {order.scaffoldCode} · {order.quantity}套
                    </div>
                  </div>
                  <div className="text-right">
                    {order.status === 'overdue' ? (
                      <Tag type="danger">已超期</Tag>
                    ) : (
                      <Tag type="warning">今日到期</Tag>
                    )}
                    <div className="font-mono text-xs text-steel-500 mt-1">
                      {format(parseISO(order.endTime), 'MM-dd HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-industrial p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 flex items-center gap-2">
              <Users size={20} className="text-industrial-info" />
              候补通知动态
            </h3>
            <Link to="/waitlist/notifications" className="font-mono text-xs text-industrial-info hover:underline">
              查看全部 →
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <div className="text-center py-8 font-mono text-sm text-steel-500">
              暂无通知记录
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map(n => (
                <div key={n.id} className="flex gap-3 p-3 bg-steel-50 border-2 border-steel-900">
                  <div className="w-2 h-2 rounded-full bg-industrial-info mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="font-mono text-xs text-steel-900">{n.message}</div>
                    <div className="font-mono text-xs text-steel-500 mt-1">
                      {format(parseISO(n.sentAt), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/billing/calculator" className="card-industrial-sm p-4 hover:shadow-industrial-lg transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-sm uppercase tracking-wider text-steel-900">计费计算器</div>
              <div className="font-mono text-xs text-steel-500 mt-1">快速计算租赁费用</div>
            </div>
            <ChevronRight size={20} className="text-steel-500 group-hover:text-industrial-peak transition-colors" />
          </div>
        </Link>
        <Link to="/scaffold/list" className="card-industrial-sm p-4 hover:shadow-industrial-lg transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-sm uppercase tracking-wider text-steel-900">脚手架管理</div>
              <div className="font-mono text-xs text-steel-500 mt-1">{stats.availableScaffolds} 套可租用</div>
            </div>
            <ChevronRight size={20} className="text-steel-500 group-hover:text-industrial-peak transition-colors" />
          </div>
        </Link>
        <Link to="/waitlist/queue" className="card-industrial-sm p-4 hover:shadow-industrial-lg transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-sm uppercase tracking-wider text-steel-900">候补队列</div>
              <div className="font-mono text-xs text-steel-500 mt-1">{stats.waitingCount} 人等待中</div>
            </div>
            <ChevronRight size={20} className="text-steel-500 group-hover:text-industrial-peak transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
