import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, Modal } from '@/components/UI';
import { Package, Plus, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { InventoryLog, Scaffold, ScaffoldStatus } from '@/types';
import { getDynamicScaffoldStatus } from '@/services/scheduleService';

export default function Inventory() {
  const scaffolds = useAppStore(s => s.scaffolds);
  const rentalOrders = useAppStore(s => s.rentalOrders);
  const inventoryLogs = useAppStore(s => s.inventoryLogs);
  const addInventoryLog = useAppStore(s => s.addInventoryLog);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    scaffoldId: '', action: 'in' as 'in' | 'out' | 'adjust', poleChange: 0, operator: '', notes: ''
  });

  const summary = useMemo(() => {
    const totalPoles = scaffolds.reduce((sum, s) => sum + s.poleCount, 0);
    let availablePoles = 0, rentedPoles = 0, maintenancePoles = 0;
    for (const s of scaffolds) {
      const dyn = getDynamicScaffoldStatus(s, rentalOrders);
      if (dyn === 'available') availablePoles += s.poleCount;
      else if (dyn === 'rented') rentedPoles += s.poleCount;
      else if (dyn === 'maintenance') maintenancePoles += s.poleCount;
    }

    const typeMap = new Map<string, number>();
    for (const s of scaffolds) {
      typeMap.set(s.type, (typeMap.get(s.type) || 0) + s.poleCount);
    }

    return { totalPoles, availablePoles, rentedPoles, maintenancePoles, typeMap: Array.from(typeMap.entries()) };
  }, [scaffolds, rentalOrders]);

  const filteredLogs = useMemo(() => inventoryLogs
    .filter(l => l.scaffoldCode.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime())
  , [inventoryLogs, search]);

  const handleSubmit = () => {
    if (!formData.scaffoldId) return;
    const scaffold = scaffolds.find(s => s.id === formData.scaffoldId);
    if (!scaffold) return;

    let change: number;
    if (formData.action === 'out') {
      change = -Math.abs(formData.poleChange);
      if (formData.poleChange <= 0) {
        alert('出库数量必须大于0');
        return;
      }
      if (Math.abs(change) > scaffold.poleCount) {
        alert(`出库数量超过当前杆件数！当前杆件数：${scaffold.poleCount}根`);
        return;
      }
    } else if (formData.action === 'in') {
      if (formData.poleChange <= 0) {
        alert('入库数量必须大于0');
        return;
      }
      change = Math.abs(formData.poleChange);
    } else {
      change = formData.poleChange;
      if (scaffold.poleCount + change < 0) {
        alert(`调整后杆件数不能为负数！调整后：${scaffold.poleCount + change}根`);
        return;
      }
    }

    const after = scaffold.poleCount + change;

    const log: InventoryLog = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      scaffoldId: scaffold.id,
      scaffoldCode: scaffold.code,
      action: formData.action,
      poleChange: change,
      poleAfter: after,
      createdAt: new Date().toISOString(),
      operator: formData.operator || '系统管理员',
      notes: formData.notes,
    };

    addInventoryLog(log);
    useAppStore.getState().updateScaffold(scaffold.id, { poleCount: after });
    setModalOpen(false);
    setFormData({ scaffoldId: '', action: 'in', poleChange: 0, operator: '', notes: '' });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'in': return <ArrowDownCircle size={16} className="text-industrial-success" />;
      case 'out': return <ArrowUpCircle size={16} className="text-industrial-peak" />;
      case 'adjust': return <ArrowRightLeft size={16} className="text-industrial-info" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'in': return { text: '入库', type: 'success' as const };
      case 'out': return { text: '出库', type: 'peak' as const };
      default: return { text: '调整', type: 'info' as const };
    }
  };

  return (
    <div>
      <PageHeader
        title="库存盘点"
        subtitle="管理脚手架杆件库存，记录出入库操作"
        actions={<button className="btn-industrial-success" onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-2"><Plus size={16} /> 登记出入库</span>
        </button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-steel-800 text-white flex items-center justify-center border-2 border-steel-900">
              <Package size={22} />
            </div>
            <div>
              <div className="stat-value">{summary.totalPoles}</div>
              <div className="stat-label">杆件总数</div>
            </div>
          </div>
        </div>
        <div className="card-industrial p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-industrial-success text-white flex items-center justify-center border-2 border-steel-900">
              <Package size={22} />
            </div>
            <div>
              <div className="stat-value text-industrial-success">{summary.availablePoles}</div>
              <div className="stat-label">空闲可用</div>
            </div>
          </div>
        </div>
        <div className="card-industrial p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-industrial-peak text-white flex items-center justify-center border-2 border-steel-900">
              <Package size={22} />
            </div>
            <div>
              <div className="stat-value text-industrial-peak">{summary.rentedPoles}</div>
              <div className="stat-label">租赁中</div>
            </div>
          </div>
        </div>
        <div className="card-industrial p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-industrial-warning text-white flex items-center justify-center border-2 border-steel-900">
              <Package size={22} />
            </div>
            <div>
              <div className="stat-value text-industrial-warning">{summary.maintenancePoles}</div>
              <div className="stat-label">维修损耗</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 card-industrial p-5">
          <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900 mb-4">按类型统计</h3>
          <div className="space-y-3">
            {summary.typeMap.map(([type, count]) => {
              const percent = Math.round((count / summary.totalPoles) * 100);
              return (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-xs text-steel-700">{type}</span>
                    <span className="font-display font-bold text-sm text-steel-900">{count} 根 ({percent}%)</span>
                  </div>
                  <div className="h-3 bg-steel-100 border-2 border-steel-900 overflow-hidden">
                    <div className="h-full bg-industrial-peak" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 card-industrial overflow-hidden">
          <div className="bg-steel-800 text-white px-5 py-4 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg uppercase tracking-wider">脚手架杆件明细</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>类型</th>
                  <th>杆件数</th>
                  <th>状态</th>
                  <th>位置</th>
                </tr>
              </thead>
              <tbody>
                {scaffolds.map(s => {
                  const dyn = getDynamicScaffoldStatus(s, rentalOrders);
                  return (
                  <tr key={s.id}>
                    <td className="font-mono">{s.code}</td>
                    <td>{s.type}</td>
                    <td className="font-display font-bold">{s.poleCount} 根</td>
                    <td>
                      <Tag type={dyn === 'available' ? 'success' : dyn === 'rented' ? 'peak' : 'warning'}>
                        {dyn === 'available' ? '空闲' : dyn === 'rented' ? '租赁中' : '维修中'}
                      </Tag>
                    </td>
                    <td className="font-mono">{s.location || '-'}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card-industrial p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900">出入库记录</h3>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              className="input-industrial pl-10 !w-64"
              placeholder="搜索脚手架编号..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-industrial">
            <thead>
              <tr>
                <th>时间</th>
                <th>脚手架</th>
                <th>操作类型</th>
                <th>变动</th>
                <th>操作后数量</th>
                <th>操作员</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 font-mono text-sm text-steel-500">暂无出入库记录</td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const label = getActionLabel(log.action);
                  return (
                    <tr key={log.id}>
                      <td className="font-mono text-xs">{format(parseISO(log.createdAt), 'yyyy-MM-dd HH:mm')}</td>
                      <td className="font-mono">{log.scaffoldCode}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Tag type={label.type}>{label.text}</Tag>
                        </div>
                      </td>
                      <td className={`font-display font-bold ${log.poleChange > 0 ? 'text-industrial-success' : log.poleChange < 0 ? 'text-industrial-danger' : ''}`}>
                        {log.poleChange > 0 ? '+' : ''}{log.poleChange}
                      </td>
                      <td className="font-display font-bold">{log.poleAfter}</td>
                      <td>{log.operator}</td>
                      <td className="font-mono text-xs text-steel-500">{log.notes || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="登记出入库"
        footer={
          <>
            <button className="btn-industrial-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-industrial" onClick={handleSubmit}>确认</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-industrial">选择脚手架</label>
            <select
              className="input-industrial"
              value={formData.scaffoldId}
              onChange={e => setFormData(p => ({ ...p, scaffoldId: e.target.value }))}
            >
              <option value="">请选择脚手架</option>
              {scaffolds.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.type} (当前：{s.poleCount}根)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-industrial">操作类型</label>
            <div className="grid grid-cols-3 gap-2">
              {(['in', 'out', 'adjust'] as const).map(a => (
                <button
                  key={a}
                  className={`py-2 font-display font-semibold uppercase tracking-wider text-sm border-2 border-steel-900 ${
                    formData.action === a ? 'bg-steel-800 text-white' : 'bg-white text-steel-900 hover:bg-steel-100'
                  }`}
                  onClick={() => setFormData(p => ({ ...p, action: a }))}
                >
                  {a === 'in' ? '入库' : a === 'out' ? '出库' : '调整'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-industrial">杆件数量变动</label>
            <input
              type="number"
              className="input-industrial"
              value={formData.poleChange}
              onChange={e => setFormData(p => ({ ...p, poleChange: Number(e.target.value) }))}
              placeholder={formData.action === 'adjust' ? '输入最终调整量（正加负减）' : '输入数量'}
            />
          </div>
          <div>
            <label className="label-industrial">操作员</label>
            <input className="input-industrial" value={formData.operator} onChange={e => setFormData(p => ({ ...p, operator: e.target.value }))} placeholder="系统管理员" />
          </div>
          <div>
            <label className="label-industrial">备注</label>
            <textarea className="input-industrial !h-20 resize-none" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
