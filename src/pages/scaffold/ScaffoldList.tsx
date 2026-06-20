import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PageHeader, Tag, Modal, EmptyState } from '@/components/UI';
import { Plus, Edit2, Trash2, Building2, Package, Search, Filter } from 'lucide-react';
import { Scaffold, ScaffoldStatus } from '@/types';
import { format } from 'date-fns';

const statusLabel: Record<ScaffoldStatus, string> = {
  available: '空闲',
  rented: '租赁中',
  maintenance: '维修中',
};

const statusType: Record<ScaffoldStatus, 'success' | 'peak' | 'warning'> = {
  available: 'success',
  rented: 'peak',
  maintenance: 'warning',
};

export default function ScaffoldList() {
  const scaffolds = useAppStore(s => s.scaffolds);
  const rentalOrders = useAppStore(s => s.rentalOrders);
  const addScaffold = useAppStore(s => s.addScaffold);
  const updateScaffold = useAppStore(s => s.updateScaffold);
  const deleteScaffold = useAppStore(s => s.deleteScaffold);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScaffoldStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Scaffold | null>(null);
  const [formData, setFormData] = useState({
    code: '', type: '门式脚手架', poleCount: 100, status: 'available' as ScaffoldStatus, location: '', notes: ''
  });

  const filteredScaffolds = scaffolds.filter(s => {
    const matchSearch = s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openNew = () => {
    setEditing(null);
    setFormData({ code: `SF-${format(new Date(), 'yyyyMMdd')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`, type: '门式脚手架', poleCount: 100, status: 'available', location: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Scaffold) => {
    setEditing(s);
    setFormData({ code: s.code, type: s.type, poleCount: s.poleCount, status: s.status, location: s.location || '', notes: s.notes || '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.code.trim()) return;
    if (editing) {
      updateScaffold(editing.id, formData);
    } else {
      addScaffold(formData);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该脚手架档案？')) {
      deleteScaffold(id);
    }
  };

  const getActiveRental = (scaffoldId: string) => {
    return rentalOrders.find(o => o.scaffoldId === scaffoldId && (o.status === 'active' || o.status === 'overdue'));
  };

  const stats = {
    total: scaffolds.length,
    available: scaffolds.filter(s => s.status === 'available').length,
    rented: scaffolds.filter(s => s.status === 'rented').length,
    maintenance: scaffolds.filter(s => s.status === 'maintenance').length,
    totalPoles: scaffolds.reduce((sum, s) => sum + s.poleCount, 0),
  };

  return (
    <div>
      <PageHeader
        title="脚手架列表"
        subtitle="管理脚手架档案，查看状态与杆件数量"
        actions={<button className="btn-industrial-success" onClick={openNew}>
          <span className="flex items-center gap-2"><Plus size={16} /> 新增脚手架</span>
        </button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总数</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-success">{stats.available}</div>
          <div className="stat-label">空闲</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-peak">{stats.rented}</div>
          <div className="stat-label">租赁中</div>
        </div>
        <div className="card-industrial-sm p-4 text-center">
          <div className="stat-value text-industrial-warning">{stats.maintenance}</div>
          <div className="stat-label">维修中</div>
        </div>
        <div className="card-industrial-sm p-4 text-center col-span-2 md:col-span-1">
          <div className="stat-value">{stats.totalPoles}</div>
          <div className="stat-label">杆件总数</div>
        </div>
      </div>

      <div className="card-industrial-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              className="input-industrial pl-10"
              placeholder="搜索编号或类型..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-steel-500" />
          <select
            className="input-industrial !w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">全部状态</option>
            <option value="available">空闲</option>
            <option value="rented">租赁中</option>
            <option value="maintenance">维修中</option>
          </select>
        </div>
      </div>

      {filteredScaffolds.length === 0 ? (
        <EmptyState
          icon={<Building2 size={48} />}
          title="暂无脚手架档案"
          description="点击右上角按钮新增脚手架档案"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScaffolds.map(s => {
            const activeRental = getActiveRental(s.id);
            return (
              <div key={s.id} className="card-industrial p-4 hover:shadow-industrial-lg transition-all relative">
                <div className="absolute top-3 right-3 flex gap-1">
                  <button className="p-1.5 hover:bg-steel-100 border-2 border-steel-900" onClick={() => openEdit(s)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="p-1.5 hover:bg-red-100 border-2 border-steel-900 text-industrial-danger" onClick={() => handleDelete(s.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-steel-800 text-white flex items-center justify-center border-2 border-steel-900 shrink-0">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-steel-500">编号</div>
                    <div className="font-display font-bold text-lg text-steel-900">{s.code}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono text-steel-500">类型</span>
                    <span className="font-display font-semibold text-steel-900">{s.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-steel-500">杆件数</span>
                    <span className="font-mono font-bold text-steel-900 flex items-center gap-1">
                      <Package size={14} />{s.poleCount} 根
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-steel-500">位置</span>
                    <span className="font-mono text-steel-900">{s.location || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-steel-200">
                    <span className="font-mono text-steel-500">状态</span>
                    <Tag type={statusType[s.status]}>{statusLabel[s.status]}</Tag>
                  </div>
                </div>

                {activeRental && (
                  <div className="mt-3 p-2 bg-steel-50 border-2 border-steel-900">
                    <div className="font-mono text-xs text-steel-500">当前租赁客户</div>
                    <div className="font-display font-semibold text-sm text-steel-900 truncate">{activeRental.customerName}</div>
                    <div className="font-mono text-xs text-steel-500 mt-1">
                      到期：{format(new Date(activeRental.endTime), 'MM-dd HH:mm')}
                    </div>
                  </div>
                )}

                {s.notes && (
                  <div className="mt-2 text-xs font-mono text-steel-500 italic truncate">
                    备注：{s.notes}
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
        title={editing ? '编辑脚手架' : '新增脚手架'}
        footer={
          <>
            <button className="btn-industrial-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-industrial" onClick={handleSave}>保存</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-industrial">脚手架编号</label>
            <input className="input-industrial" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
          </div>
          <div>
            <label className="label-industrial">脚手架类型</label>
            <select className="input-industrial" value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
              <option>门式脚手架</option>
              <option>碗扣式脚手架</option>
              <option>扣件式钢管脚手架</option>
              <option>盘扣式脚手架</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-industrial">杆件数量</label>
              <input type="number" className="input-industrial" value={formData.poleCount} onChange={e => setFormData(p => ({ ...p, poleCount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label-industrial">当前状态</label>
              <select className="input-industrial" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as ScaffoldStatus }))}>
                <option value="available">空闲</option>
                <option value="rented">租赁中</option>
                <option value="maintenance">维修中</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-industrial">存放位置</label>
            <input className="input-industrial" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="如：A区-01" />
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
