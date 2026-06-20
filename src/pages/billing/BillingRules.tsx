import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, Modal } from '@/components/UI';
import { Plus, Edit2, Trash2, Check, Clock } from 'lucide-react';
import { RateRule, TimeSlot, RateType } from '@/types';
import { format } from 'date-fns';
import { getRateLabel, getRateColor } from '@/services/billingService';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export default function BillingRules() {
  const rateRules = useAppStore(s => s.rateRules);
  const activeRuleId = useAppStore(s => s.activeRuleId);
  const setActiveRule = useAppStore(s => s.setActiveRule);
  const addRateRule = useAppStore(s => s.addRateRule);
  const updateRateRule = useAppStore(s => s.updateRateRule);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RateRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    slots: [{ id: generateId(), startTime: '00:00', endTime: '08:00', rateType: 'valley' as RateType, pricePerHour: 3 }],
  });

  const openNew = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
      slots: [
        { id: generateId(), startTime: '00:00', endTime: '08:00', rateType: 'valley', pricePerHour: 3 },
        { id: generateId(), startTime: '08:00', endTime: '18:00', rateType: 'peak', pricePerHour: 8.5 },
        { id: generateId(), startTime: '18:00', endTime: '24:00', rateType: 'normal', pricePerHour: 5 },
      ],
    });
    setModalOpen(true);
  };

  const openEdit = (rule: RateRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      effectiveDate: rule.effectiveDate,
      slots: [...rule.slots],
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    if (formData.slots.length === 0) return;

    if (editingRule) {
      updateRateRule(editingRule.id, formData);
    } else {
      addRateRule({
        id: generateId(),
        ...formData,
        isActive: false,
        createdAt: new Date().toISOString(),
      });
    }
    setModalOpen(false);
  };

  const addSlot = () => {
    const lastSlot = formData.slots[formData.slots.length - 1];
    const startTime = lastSlot ? lastSlot.endTime : '00:00';
    setFormData(prev => ({
      ...prev,
      slots: [...prev.slots, { id: generateId(), startTime, endTime: '24:00', rateType: 'normal', pricePerHour: 5 }]
    }));
  };

  const removeSlot = (id: string) => {
    setFormData(prev => ({
      ...prev,
      slots: prev.slots.filter(s => s.id !== id),
    }));
  };

  const updateSlot = (id: string, key: keyof TimeSlot, value: any) => {
    setFormData(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === id ? { ...s, [key]: value } : s),
    }));
  };

  const setAsActive = (ruleId: string) => {
    setActiveRule(ruleId);
  };

  return (
    <div>
      <PageHeader
        title="计费规则配置"
        subtitle="配置分时段费率规则，设置高峰/平峰/低谷时段及对应单价"
        actions={<button className="btn-industrial-success" onClick={openNew}>
          <span className="flex items-center gap-2"><Plus size={16} /> 新建规则</span>
        </button>}
      />

      <div className="space-y-6">
        {rateRules.map(rule => (
          <div key={rule.id} className="card-industrial overflow-hidden">
            <div className="bg-steel-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-display font-bold text-lg uppercase tracking-wider">
                  {rule.name}
                </h3>
                {rule.id === activeRuleId && <Tag type="success">当前生效</Tag>}
                {rule.id !== activeRuleId && <Tag type="warning">未启用</Tag>}
              </div>
              <div className="flex items-center gap-2">
                {rule.id !== activeRuleId && (
                  <button className="btn-industrial-outline !py-1 !px-3 !text-xs" onClick={() => setAsActive(rule.id)}>
                    <span className="flex items-center gap-1"><Check size={14} /> 设为生效</span>
                  </button>
                )}
                <button className="btn-industrial-outline !py-1 !px-3 !text-xs" onClick={() => openEdit(rule)}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="font-mono text-sm text-steel-500 mb-4">
                <Clock size={14} className="inline mr-1" />生效日期：{rule.effectiveDate}
              </div>

              <div className="space-y-2">
                {rule.slots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-4 p-3 bg-steel-50 border-2 border-steel-900">
                    <div className={`w-3 h-16 rounded ${getRateColor(slot.rateType)} shrink-0`} />
                    <div className="flex-1 font-mono text-sm text-steel-900">
                      {slot.startTime} — {slot.endTime}
                    </div>
                    <Tag type={slot.rateType as any}>
                      {getRateLabel(slot.rateType)}
                    </Tag>
                    <div className="font-display font-bold text-lg text-steel-900 w-24 text-right">
                      ¥{slot.pricePerHour.toFixed(2)}
                      <span className="font-mono text-xs text-steel-500 font-normal">/小时</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-steel-200">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-industrial-peak rounded" />
                    <span className="font-mono text-xs text-steel-500">高峰</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-industrial-normal rounded" />
                    <span className="font-mono text-xs text-steel-500">平峰</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-industrial-valley rounded" />
                    <span className="font-mono text-xs text-steel-500">低谷</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? '编辑计费规则' : '新建计费规则'}
        footer={
          <>
            <button className="btn-industrial-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-industrial" onClick={handleSave}>保存</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-industrial">规则名称</label>
            <input
              className="input-industrial"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="如：标准费率规则"
            />
          </div>
          <div>
            <label className="label-industrial">生效日期</label>
            <input
              type="date"
              className="input-industrial"
              value={formData.effectiveDate}
              onChange={e => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
            />
          </div>

          <div className="divider-industrial !my-3" />

          <div className="flex items-center justify-between">
            <label className="label-industrial !mb-0">时段费率配置</label>
            <button className="btn-industrial-outline !py-1 !px-3 !text-xs" onClick={addSlot}>
              <span className="flex items-center gap-1"><Plus size={14} /> 添加时段</span>
            </button>
          </div>

          <div className="space-y-3">
            {formData.slots.map(slot => (
              <div key={slot.id} className="p-3 bg-steel-50 border-2 border-steel-900">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-3">
                    <label className="label-industrial">开始时间</label>
                    <input
                      type="time"
                      className="input-industrial"
                      value={slot.startTime}
                      onChange={e => updateSlot(slot.id, 'startTime', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label-industrial">结束时间</label>
                    <input
                      type="time"
                      className="input-industrial"
                      value={slot.endTime}
                      onChange={e => updateSlot(slot.id, 'endTime', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label-industrial">费率类型</label>
                    <select
                      className="input-industrial"
                      value={slot.rateType}
                      onChange={e => updateSlot(slot.id, 'rateType', e.target.value as RateType)}
                    >
                      <option value="peak">高峰</option>
                      <option value="normal">平峰</option>
                      <option value="valley">低谷</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-industrial">单价(元/小时)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-industrial"
                      value={slot.pricePerHour}
                      onChange={e => updateSlot(slot.id, 'pricePerHour', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end pt-6">
                    {formData.slots.length > 1 && (
                      <button
                        className="p-2 text-industrial-danger hover:bg-white border-2 border-steel-900"
                        onClick={() => removeSlot(slot.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
