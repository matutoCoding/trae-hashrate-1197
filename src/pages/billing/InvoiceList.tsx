import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, EmptyState } from '@/components/UI';
import { Receipt, Search, Download, Eye, FileText, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Invoice, InvoiceStatus } from '@/types';
import { exportInvoiceAsCSV, downloadFile, filterInvoices } from '@/services/invoiceService';

const statusLabel: Record<InvoiceStatus, string> = {
  draft: '草稿',
  issued: '已开具',
  paid: '已支付',
  overdue: '已逾期',
};

const statusType: Record<InvoiceStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'info',
  issued: 'warning',
  paid: 'success',
  overdue: 'danger',
};

export default function InvoiceList() {
  const invoices = useAppStore(s => s.invoices);
  const issueInvoice = useAppStore(s => s.issueInvoiceById);
  const payInvoice = useAppStore(s => s.payInvoice);
  const createInvoice = useAppStore(s => s.createInvoice);
  const rentalOrders = useAppStore(s => s.rentalOrders);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let result = filterInvoices(invoices, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      customerName: search || undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    });
    return result.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [invoices, search, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    issued: invoices.filter(i => i.status === 'issued').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    pendingAmount: invoices.filter(i => i.status === 'issued' || i.status === 'overdue').reduce((sum, i) => sum + i.totalAmount, 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0),
  }), [invoices]);

  const handleExport = (invoice: Invoice) => {
    const csv = exportInvoiceAsCSV(invoice);
    downloadFile(csv, `账单-${invoice.id}.csv`);
  };

  const handleIssue = (id: string) => {
    issueInvoice(id);
  };

  const handlePay = (id: string) => {
    payInvoice(id);
  };

  const ordersWithoutInvoice = rentalOrders.filter(o => o.totalAmount && !invoices.some(i => i.orderId === o.id));

  return (
    <div>
      <PageHeader
        title="账单管理"
        subtitle="查看、开具、导出租赁账单"
        actions={ordersWithoutInvoice.length > 0 && (
          <button className="btn-industrial" onClick={() => ordersWithoutInvoice.forEach(o => createInvoice(o.id))}>
            <span className="flex items-center gap-2"><Receipt size={16} /> 批量生成账单 ({ordersWithoutInvoice.length})</span>
          </button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">账单总数</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-warning">{stats.issued + stats.overdue}</div>
          <div className="stat-label">待收 ¥{stats.pendingAmount.toFixed(2)}</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-success">{stats.paid}</div>
          <div className="stat-label">已收款 ¥{stats.paidAmount.toFixed(2)}</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-peak">¥{stats.totalAmount.toFixed(2)}</div>
          <div className="stat-label">累计金额</div>
        </div>
      </div>

      <div className="card-industrial-sm p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label-industrial">搜索客户</label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              className="input-industrial pl-10"
              placeholder="输入客户名称..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label-industrial">状态</label>
          <select
            className="input-industrial !w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="issued">已开具</option>
            <option value="paid">已支付</option>
            <option value="overdue">已逾期</option>
          </select>
        </div>
        <div>
          <label className="label-industrial">从</label>
          <input type="date" className="input-industrial !w-auto" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label-industrial">至</label>
          <input type="date" className="input-industrial !w-auto" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button
          className="btn-industrial-outline"
          onClick={() => { setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
        >
          重置
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={48} />}
          title="暂无账单记录"
          description="调整筛选条件或先生成租赁订单"
        />
      ) : (
        <div className="card-industrial overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>账单编号</th>
                  <th>客户名称</th>
                  <th>创建时间</th>
                  <th>总时长</th>
                  <th>总金额</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-mono font-bold">{inv.id.toUpperCase()}</td>
                    <td className="font-display font-semibold">{inv.customerName}</td>
                    <td className="font-mono text-xs">{format(parseISO(inv.createdAt), 'yyyy-MM-dd HH:mm')}</td>
                    <td className="font-mono">
                      {inv.billingResult.totalHours.toFixed(1)}小时
                    </td>
                    <td className="font-display font-bold text-xl text-industrial-peak">¥{inv.totalAmount.toFixed(2)}</td>
                    <td>
                      <Tag type={statusType[inv.status]}>{statusLabel[inv.status]}</Tag>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link to={`/bills/${inv.id}`} className="p-1.5 hover:bg-steel-100 border-2 border-steel-900" title="查看详情">
                          <Eye size={14} />
                        </Link>
                        <button className="p-1.5 hover:bg-steel-100 border-2 border-steel-900" title="导出" onClick={() => handleExport(inv)}>
                          <Download size={14} />
                        </button>
                        {inv.status === 'draft' && (
                          <button className="p-1.5 hover:bg-industrial-warning/10 border-2 border-steel-900 text-industrial-warning" title="开具账单" onClick={() => handleIssue(inv.id)}>
                            <FileText size={14} />
                          </button>
                        )}
                        {inv.status === 'issued' && (
                          <button className="p-1.5 hover:bg-industrial-success/10 border-2 border-steel-900 text-industrial-success" title="确认收款" onClick={() => handlePay(inv.id)}>
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
