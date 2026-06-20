import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag } from '@/components/UI';
import { getRateLabel, getRateColor } from '@/services/billingService';

export default function RateTable() {
  const rateRules = useAppStore(s => s.rateRules);
  const activeRule = useMemo(() => rateRules.find(r => r.isActive), [rateRules]);

  if (!activeRule) {
    return (
      <div>
        <PageHeader title="时段费率表" subtitle="查看当前生效的时段费率明细" />
        <div className="card-industrial-sm p-12 text-center">
          <p className="font-mono text-sm text-steel-500">暂无生效的计费规则</p>
        </div>
      </div>
    );
  }

  const sortedSlots = [...activeRule.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <PageHeader
        title="时段费率表"
        subtitle={`当前规则：${activeRule.name} · 生效日期：${activeRule.effectiveDate}`}
      />

    <div className="card-industrial overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>时段编号</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>时长(小时)</th>
              <th>费率类型</th>
              <th>单价(元/小时)</th>
              <th>色标</th>
            </tr>
          </thead>
          <tbody>
            {sortedSlots.map((slot, idx) => {
              const [sh, sm] = slot.startTime.split(':').map(Number);
              const [eh, em] = slot.endTime === '24:00' ? [24, 0] : slot.endTime.split(':').map(Number);
              const duration = (eh * 60 + em - sh * 60 - sm) / 60;

              return (
                <tr key={slot.id}>
                  <td className="font-mono">#{String(idx + 1).padStart(2, '0')}</td>
                  <td className="font-mono">{slot.startTime}</td>
                  <td className="font-mono">{slot.endTime}</td>
                  <td className="font-mono">{duration.toFixed(1)}</td>
                  <td>
                    <Tag type={slot.rateType as any}>
                      {getRateLabel(slot.rateType)}
                    </Tag>
                  </td>
                  <td className="font-display font-bold">¥{slot.pricePerHour.toFixed(2)}</td>
                  <td>
                    <div className={`w-12 h-4 rounded ${getRateColor(slot.rateType)} border-2 border-steel-900`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card-industrial-sm p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-industrial-peak border-2 border-steel-900 flex items-center justify-center">
          <span className="font-display font-bold text-white text-xl">峰</span>
        </div>
        <div>
          <div className="stat-label">高峰时段</div>
          <div className="font-display font-bold text-steel-900">
            {sortedSlots.filter(s => s.rateType === 'peak').length} 个时段
          </div>
        </div>
      </div>
      <div className="card-industrial-sm p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-industrial-normal border-2 border-steel-900 flex items-center justify-center">
          <span className="font-display font-bold text-white text-xl">平</span>
        </div>
        <div>
          <div className="stat-label">平峰时段</div>
          <div className="font-display font-bold text-steel-900">
            {sortedSlots.filter(s => s.rateType === 'normal').length} 个时段
          </div>
        </div>
      </div>
      <div className="card-industrial-sm p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-industrial-valley border-2 border-steel-900 flex items-center justify-center">
          <span className="font-display font-bold text-white text-xl">谷</span>
        </div>
        <div>
          <div className="stat-label">低谷时段</div>
          <div className="font-display font-bold text-steel-900">
            {sortedSlots.filter(s => s.rateType === 'valley').length} 个时段
          </div>
        </div>
      </div>
    </div>

    <div className="mt-6 card-industrial p-5">
      <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-3">
        24小时费率时间轴</h3>
      <div className="relative h-12 border-2 border-steel-900 flex overflow-hidden">
        {sortedSlots.map((slot) => {
          const [sh] = slot.startTime.split(':').map(Number);
          const [eh] = slot.endTime === '24:00' ? [24, 0] : slot.endTime.split(':').map(Number);
          const width = ((eh - sh) / 24) * 100;
          return (
            <div
              key={slot.id}
              className={`${getRateColor(slot.rateType)} relative flex items-center justify-center`}
              style={{ width: `${width}%` }}
              title={`${slot.startTime}-${slot.endTime} ${getRateLabel(slot.rateType)} ¥${slot.pricePerHour}/h`}
            >
              <span className="font-display font-bold text-white text-xs">{slot.startTime}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        {['00:00', '06:00', '12:00', '18:00', '24:00'].map(t => (
          <span className="font-mono text-xs text-steel-500">{t}</span>
        ))}
      </div>
    </div>
    </div>
  );
}
