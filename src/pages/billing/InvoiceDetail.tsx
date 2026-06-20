import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag } from '@/components/UI';
import { ArrowLeft, Download, FileText, CheckCircle, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { exportInvoiceAsCSV, downloadFile } from '@/services/invoiceService';
import { getRateLabel, getRateColor, formatDuration, formatCurrency } from '@/services/billingService';

const statusLabel = {
  draft: '草稿',
  issued: '已开具',
  paid: '已支付',
  overdue: '已逾期',
};

const statusType: Record<string, 'peak' | 'normal' | 'valley' | 'danger' | 'info' | 'warning' | 'success'> = {
  draft: 'info',
  issued: 'warning',
  paid: 'success',
  overdue: 'danger',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoices = useAppStore(s => s.invoices);
  const issueInvoice = useAppStore(s => s.issueInvoiceById);
  const payInvoice = useAppStore(s => s.payInvoice);
  const rentalOrders = useAppStore(s => s.rentalOrders);

  const invoice = useMemo(() => invoices.find(i => i.id === id), [invoices, id]);
  const order = useMemo(() => rentalOrders.find(o => o.id === invoice?.orderId), [rentalOrders, invoice]);

  if (!invoice) {
    return (
      <div>
        <PageHeader title="账单详情" />
        <div className="card-industrial-sm p-12 text-center">
          <p className="font-mono text-sm text-steel-500">账单不存在</p>
          <Link to="/bills/list" className="btn-industrial mt-4 inline-block">返回列表</Link>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const csv = exportInvoiceAsCSV(invoice);
    downloadFile(csv, `账单-${invoice.id}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        title="账单详情"
        subtitle={`账单编号：${invoice.id.toUpperCase()}`}
        actions={
          <>
            <button className="btn-industrial-outline" onClick={() => navigate(-1)}>
              <span className="flex items-center gap-2"><ArrowLeft size={16} /> 返回</span>
            </button>
            <button className="btn-industrial-outline" onClick={handlePrint}>
              <span className="flex items-center gap-2"><Printer size={16} /> 打印</span>
            </button>
            <button className="btn-industrial-outline" onClick={handleExport}>
              <span className="flex items-center gap-2"><Download size={16} /> 导出CSV</span>
            </button>
            {invoice.status === 'draft' && (
              <button className="btn-industrial" onClick={() => issueInvoice(invoice.id)}>
                <span className="flex items-center gap-2"><FileText size={16} /> 开具账单</span>
              </button>
            )}
            {invoice.status === 'issued' && (
              <button className="btn-industrial-success" onClick={() => payInvoice(invoice.id)}>
                <span className="flex items-center gap-2"><CheckCircle size={16} /> 确认收款</span>
              </button>
            )}
          </>
        }
      />

      <div className="card-industrial overflow-hidden" id="invoice-print">
        <div className="bg-steel-800 text-white px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display font-bold text-3xl uppercase tracking-widest">脚手架租赁账单</h1>
              <p className="font-mono text-sm text-steel-300 mt-2">SCAFFOLD RENTAL INVOICE</p>
            </div>
            <div className="text-right">
              <Tag type={statusType[invoice.status as keyof typeof statusType]}>{statusLabel[invoice.status as keyof typeof statusLabel]}</Tag>
              <div className="font-mono text-sm mt-3">
                <div>账单编号：<span className="font-bold">{invoice.id.toUpperCase()}</span></div>
                <div>创建时间：{format(parseISO(invoice.createdAt), 'yyyy-MM-dd HH:mm:ss')}</div>
                {invoice.issuedAt && <div>开具时间：{format(parseISO(invoice.issuedAt), 'yyyy-MM-dd HH:mm:ss')}</div>}
                {invoice.paidAt && <div>收款时间：{format(parseISO(invoice.paidAt), 'yyyy-MM-dd HH:mm:ss')}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-display font-bold uppercase tracking-wider text-steel-900 text-lg border-b-2 border-steel-900 pb-2 mb-3">客户信息</h3>
              <div className="font-mono text-sm space-y-1 text-steel-700">
                <div><span className="text-steel-500">客户名称：</span><span className="font-semibold">{invoice.customerName}</span></div>
                {order && (
                  <>
                    <div><span className="text-steel-500">联系电话：</span>{order.customerPhone}</div>
                    <div><span className="text-steel-500">脚手架：</span>{order.scaffoldType} ({order.scaffoldCode})</div>
                    <div><span className="text-steel-500">租用数量：</span>{order.quantity} 套</div>
                  </>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold uppercase tracking-wider text-steel-900 text-lg border-b-2 border-steel-900 pb-2 mb-3">租赁时段</h3>
              <div className="font-mono text-sm space-y-1 text-steel-700">
                {order && (
                  <>
                    <div><span className="text-steel-500">开始时间：</span>{format(parseISO(order.startTime), 'yyyy-MM-dd HH:mm')}</div>
                    <div><span className="text-steel-500">结束时间：</span>{format(parseISO(order.endTime), 'yyyy-MM-dd HH:mm')}</div>
                    {order.actualEndTime && (
                      <div><span className="text-steel-500">实际归还：</span>{format(parseISO(order.actualEndTime), 'yyyy-MM-dd HH:mm')}</div>
                    )}
                  </>
                )}
                <div><span className="text-steel-500">总时长：</span><span className="font-semibold">{formatDuration(invoice.billingResult.totalHours)}</span></div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-display font-bold uppercase tracking-wider text-steel-900 text-lg border-b-2 border-steel-900 pb-2 mb-4">分时段费用明细</h3>
            <div className="overflow-x-auto">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>时段类型</th>
                    <th>开始时间</th>
                    <th>结束时间</th>
                    <th>时长</th>
                    <th>单价(元/小时)</th>
                    <th>数量(套)</th>
                    <th>小计(元)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.billingResult.segments.map((seg, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${getRateColor(seg.rateType as any)} border border-steel-900`} />
                          <Tag type={seg.rateType as any}>{getRateLabel(seg.rateType)}</Tag>
                        </div>
                      </td>
                      <td className="font-mono">{format(seg.startTime, 'yyyy-MM-dd HH:mm')}</td>
                      <td className="font-mono">{format(seg.endTime, 'yyyy-MM-dd HH:mm')}</td>
                      <td className="font-mono">{formatDuration(seg.durationHours)}</td>
                      <td className="font-display font-bold">¥{seg.unitPrice.toFixed(2)}</td>
                      <td className="font-mono">{order?.quantity || 1}</td>
                      <td className="font-display font-bold text-industrial-peak">¥{seg.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-industrial-sm p-5 lg:col-span-2">
              <h3 className="font-display font-bold uppercase tracking-wider text-steel-900 text-sm mb-4">时段汇总</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-industrial-peak/10 border-2 border-steel-900">
                  <div className="w-4 h-4 bg-industrial-peak rounded mx-auto mb-2 border-2 border-steel-900" />
                  <div className="font-mono text-xs text-steel-500">高峰时段</div>
                  <div className="font-display font-bold text-lg text-steel-900">{formatDuration(invoice.billingResult.peakHours)}</div>
                </div>
                <div className="text-center p-3 bg-industrial-normal/10 border-2 border-steel-900">
                  <div className="w-4 h-4 bg-industrial-normal rounded mx-auto mb-2 border-2 border-steel-900" />
                  <div className="font-mono text-xs text-steel-500">平峰时段</div>
                  <div className="font-display font-bold text-lg text-steel-900">{formatDuration(invoice.billingResult.normalHours)}</div>
                </div>
                <div className="text-center p-3 bg-industrial-valley/10 border-2 border-steel-900">
                  <div className="w-4 h-4 bg-industrial-valley rounded mx-auto mb-2 border-2 border-steel-900" />
                  <div className="font-mono text-xs text-steel-500">低谷时段</div>
                  <div className="font-display font-bold text-lg text-steel-900">{formatDuration(invoice.billingResult.valleyHours)}</div>
                </div>
              </div>
            </div>

            <div className="bg-steel-800 text-white p-6 border-2 border-steel-900">
              <div className="font-display font-bold uppercase tracking-wider text-steel-300 text-sm mb-2">应付总额</div>
              <div className="font-display font-bold text-5xl text-industrial-peak mb-4">
                {formatCurrency(invoice.totalAmount)}
              </div>
              <div className="font-mono text-xs text-steel-400 space-y-1">
                <div>租赁时长：{formatDuration(invoice.billingResult.totalHours)}</div>
                <div>分段数量：{invoice.billingResult.segments.length} 段</div>
                {invoice.originalAmount !== undefined && invoice.amountDiff !== undefined && invoice.amountDiff !== 0 && (
                  <div className="pt-2 mt-2 border-t border-steel-600 space-y-1">
                    <div>预估费用：{formatCurrency(invoice.originalAmount)}</div>
                    <div className={invoice.amountDiff > 0 ? 'text-industrial-peak' : 'text-industrial-success'}>
                      {invoice.amountDiff > 0 ? '增加' : '减少'}：{invoice.amountDiff > 0 ? '+' : ''}{formatCurrency(invoice.amountDiff)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-steel-200 grid grid-cols-3 gap-8 font-mono text-xs text-steel-500">
            <div>
              <div className="border-b-2 border-steel-400 pb-12 mb-2">制单人签字</div>
              <div>日期：____________</div>
            </div>
            <div>
              <div className="border-b-2 border-steel-400 pb-12 mb-2">客户签字确认</div>
              <div>日期：____________</div>
            </div>
            <div>
              <div className="border-b-2 border-steel-400 pb-12 mb-2">财务盖章</div>
              <div>日期：____________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
