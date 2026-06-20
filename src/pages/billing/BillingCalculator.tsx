import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag } from '@/components/UI';
import { Calculator, Clock, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { calculateRentalFee, getRateLabel, getRateColor, formatDuration, formatCurrency } from '@/services/billingService';
import { BillingSegment } from '@/types';

export default function BillingCalculator() {
  const rateRules = useAppStore(s => s.rateRules);
  const activeRule = useMemo(() => rateRules.find(r => r.isActive), [rateRules]);

  const now = new Date();
  const [startDate, setStartDate] = useState(format(now, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(now, 'HH:00'));
  const [endDate, setEndDate] = useState(format(addHours(now, 48), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(format(addHours(now, 48), 'HH:00'));
  const [quantity, setQuantity] = useState(1);

  const result = useMemo(() => {
    if (!activeRule) return null;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (end <= start) return null;
    return calculateRentalFee(start, end, quantity, activeRule);
  }, [activeRule, startDate, startTime, endDate, endTime, quantity]);

  const timelineSegments = useMemo(() => {
    if (!result) return [];
    const segments: (BillingSegment & { width: number; left: number })[] = [];
    const totalMs = result.totalHours * 3600000;
    if (totalMs === 0) return [];

    let accumulated = 0;
    for (const seg of result.segments) {
      const segMs = seg.durationHours * 3600000;
      segments.push({
        ...seg,
        left: (accumulated / totalMs * 100),
        width: (segMs / totalMs * 100),
      });
      accumulated += segMs;
    }
    return segments;
  }, [result]);

  const aggregateByType = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, { duration: number; subtotal: number; type: string }>();
    for (const s of result.segments) {
      const existing = map.get(s.rateType);
      if (existing) {
        existing.duration += s.durationHours;
        existing.subtotal += s.subtotal;
      } else {
        map.set(s.rateType, { duration: s.durationHours, subtotal: s.subtotal, type: s.rateType });
      }
    }
    return Array.from(map.entries()).map(([type, data]) => ({ ...data, rateType: type }));
  }, [result]);

  return (
    <div>
      <PageHeader
        title="计费计算器"
        subtitle="选择租用起止时间，系统自动按分时段费率计算费用"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-industrial p-5">
            <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-4 flex items-center gap-2">
              <Calculator size={20} /> 参数设置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label-industrial">租用开始时间</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="input-industrial"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="input-industrial"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label-industrial">租用结束时间</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="input-industrial"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="input-industrial"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label-industrial">脚手架数量（套）</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="input-industrial"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>

              {activeRule && (
                <div className="p-3 bg-steel-50 border-2 border-steel-900">
                  <div className="font-mono text-xs text-steel-500">当前使用规则</div>
                  <div className="font-display font-bold text-steel-900 mt-1">{activeRule.name}</div>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="card-industrial p-5 bg-steel-800 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg uppercase tracking-wider">费用合计</h3>
                <DollarSign size={24} className="text-industrial-peak" />
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-5xl text-industrial-peak animate-number-roll">
                  {formatCurrency(result.totalAmount)}
                </div>
                <div className="font-mono text-sm text-steel-300 mt-2">
                  总时长：{formatDuration(result.totalHours)} × {quantity} 套
                </div>
              </div>
              <div className="divider-industrial !bg-steel-600 my-4" />
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="font-mono text-xs text-steel-400">高峰</div>
                  <div className="font-display font-bold text-industrial-peak">{formatDuration(result.peakHours)}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xs text-steel-400">平峰</div>
                  <div className="font-display font-bold text-industrial-normal">{formatDuration(result.normalHours)}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xs text-steel-400">低谷</div>
                  <div className="font-display font-bold text-industrial-valley">{formatDuration(result.valleyHours)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {result ? (
            <>
              <div className="card-industrial p-5">
                <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-4 flex items-center gap-2">
                  <Clock size={20} /> 时段费用拆分时间轴
                </h3>
                <div className="relative h-16 border-2 border-steel-900 flex overflow-hidden">
                  {timelineSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      className={`${getRateColor(seg.rateType as any)} relative group`}
                      style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                      title={`${format(seg.startTime, 'MM-dd HH:mm')} - ${format(seg.endTime, 'MM-dd HH:mm')} ${formatDuration(seg.durationHours)}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <span className="font-display font-bold text-white text-xs">
                          {getRateLabel(seg.rateType as any)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 font-mono text-xs text-steel-500">
                  <span>{format(result.segments[0].startTime, 'MM-dd HH:mm')}</span>
                  <span>{format(result.segments[result.segments.length - 1].endTime, 'MM-dd HH:mm')}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {aggregateByType.map((item: any) => (
                    <div key={item.rateType} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${getRateColor(item.rateType as any)} border-2 border-steel-900`} />
                      <span className="font-mono text-xs text-steel-700">
                        {getRateLabel(item.rateType as any)}: {formatDuration(item.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-industrial overflow-hidden">
                <div className="bg-steel-800 text-white px-5 py-4">
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={20} /> 费用明细表
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-industrial">
                    <thead>
                      <tr>
                        <th>费率类型</th>
                        <th>开始时间</th>
                        <th>结束时间</th>
                        <th>时长</th>
                        <th>单价</th>
                        <th>小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.segments.map((seg, idx) => (
                        <tr key={idx}>
                          <td>
                            <Tag type={seg.rateType as any}>
                              {getRateLabel(seg.rateType)}
                            </Tag>
                          </td>
                          <td className="font-mono">{format(seg.startTime, 'MM-dd HH:mm')}</td>
                          <td className="font-mono">{format(seg.endTime, 'MM-dd HH:mm')}</td>
                          <td className="font-mono">{formatDuration(seg.durationHours)}</td>
                          <td className="font-display font-bold">¥{seg.unitPrice.toFixed(2)}</td>
                          <td className="font-display font-bold text-industrial-peak">¥{seg.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="font-display font-bold uppercase tracking-wider text-right px-4 py-3 bg-steel-50 border-2 border-steel-900">合计</td>
                        <td className="font-display font-bold bg-steel-50 border-2 border-steel-900 px-4 py-3">
                          {formatDuration(result.totalHours)}
                        </td>
                        <td className="bg-steel-50 border-2 border-steel-900" />
                        <td className="font-display font-bold text-2xl text-industrial-peak bg-steel-50 border-2 border-steel-900 px-4 py-3">
                          {formatCurrency(result.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card-industrial-sm p-12 text-center bg-gradient-stripes h-full flex flex-col items-center justify-center">
              <Calculator size={64} className="text-steel-300 mb-4" />
              <h3 className="font-display font-bold text-xl uppercase tracking-wider text-steel-500 mb-2">
                输入参数计算费用
              </h3>
              <p className="font-mono text-sm text-steel-400">
                系统将自动按分时段费率拆分计算
                <ArrowRight className="inline ml-1" size={14} />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
