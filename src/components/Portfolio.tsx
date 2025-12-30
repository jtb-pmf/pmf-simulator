'use client';

import { useState } from 'react';
import { Investment, InvestmentStage, InvestmentStatus } from '@/types';
import { formatMoney, formatMultiple, formatDate } from '@/lib/format';
import { Plus, Edit2, Trash2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface PortfolioProps {
  investments: Investment[];
  onAddInvestment: (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'totalInvested'>) => void;
  onUpdateInvestment: (id: string, updates: Partial<Investment>) => void;
  onDeleteInvestment: (id: string) => void;
  onAddValuation: (investmentId: string, valuation: number, date: string, notes?: string) => void;
}

export function Portfolio({
  investments,
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onAddValuation,
}: PortfolioProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [valuationId, setValuationId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Summary stats
  const totalInvested = investments.reduce((sum, i) => sum + i.totalInvested, 0);
  const totalValue = investments
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.currentValuation, 0);
  const discoveryCount = investments.filter(i => i.stage === 'discovery').length;
  const convictionCount = investments.filter(i => i.stage === 'conviction').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Total Invested" value={formatMoney(totalInvested)} />
        <SummaryCard label="Current Value" value={formatMoney(totalValue)} />
        <SummaryCard label="Discovery" value={discoveryCount.toString()} subtitle="investments" />
        <SummaryCard label="Conviction" value={convictionCount.toString()} subtitle="investments" />
      </div>

      {/* Portfolio Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Portfolio</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Investment
          </button>
        </div>

        {investments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No investments yet. Add your first investment to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left p-3">Company</th>
                  <th className="text-center p-3">Stage</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-right p-3">Invested</th>
                  <th className="text-right p-3">Current Value</th>
                  <th className="text-right p-3">MOIC</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((investment) => (
                  <InvestmentRow
                    key={investment.id}
                    investment={investment}
                    isExpanded={expandedId === investment.id}
                    onToggleExpand={() => setExpandedId(expandedId === investment.id ? null : investment.id)}
                    onEdit={() => setEditingId(investment.id)}
                    onDelete={() => onDeleteInvestment(investment.id)}
                    onAddValuation={() => setValuationId(investment.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Investment Modal */}
      {showAddForm && (
        <InvestmentForm
          onSubmit={(data) => {
            onAddInvestment(data);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Investment Modal */}
      {editingId && (
        <InvestmentForm
          investment={investments.find(i => i.id === editingId)}
          onSubmit={(data) => {
            onUpdateInvestment(editingId, data);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Add Valuation Modal */}
      {valuationId && (
        <ValuationForm
          investment={investments.find(i => i.id === valuationId)!}
          onSubmit={(valuation, date, notes) => {
            onAddValuation(valuationId, valuation, date, notes);
            setValuationId(null);
          }}
          onCancel={() => setValuationId(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function InvestmentRow({
  investment,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddValuation,
}: {
  investment: Investment;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddValuation: () => void;
}) {
  const moic = investment.status === 'exited'
    ? investment.exitMultiple || 0
    : investment.currentValuation / investment.totalInvested;

  const stageColor = investment.stage === 'conviction' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300';
  const statusColor = {
    active: 'bg-green-900 text-green-300',
    exited: 'bg-purple-900 text-purple-300',
    written_off: 'bg-red-900 text-red-300',
  }[investment.status];

  return (
    <>
      <tr className="border-b border-gray-800 hover:bg-gray-800/50">
        <td className="p-3">
          <button onClick={onToggleExpand} className="flex items-center gap-2 text-white font-medium hover:text-blue-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {investment.companyName}
          </button>
        </td>
        <td className="p-3 text-center">
          <span className={`px-2 py-1 rounded text-xs ${stageColor}`}>
            {investment.stage}
          </span>
        </td>
        <td className="p-3 text-center">
          <span className={`px-2 py-1 rounded text-xs ${statusColor}`}>
            {investment.status.replace('_', ' ')}
          </span>
        </td>
        <td className="p-3 text-right text-white">{formatMoney(investment.totalInvested)}</td>
        <td className="p-3 text-right text-white">{formatMoney(investment.currentValuation)}</td>
        <td className="p-3 text-right">
          <span className={moic >= 1 ? 'text-green-400' : 'text-red-400'}>
            {formatMultiple(moic)}
          </span>
        </td>
        <td className="p-3 text-right">
          <div className="flex justify-end gap-2">
            <button onClick={onAddValuation} className="p-1 text-gray-400 hover:text-green-400" title="Update Valuation">
              <TrendingUp size={16} />
            </button>
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-400" title="Edit">
              <Edit2 size={16} />
            </button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-400" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-800/30">
          <td colSpan={7} className="p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Discovery Amount</div>
                <div className="text-white">{formatMoney(investment.discoveryAmount)}</div>
              </div>
              <div>
                <div className="text-gray-400">Conviction Amount</div>
                <div className="text-white">{formatMoney(investment.convictionAmount)}</div>
              </div>
              <div>
                <div className="text-gray-400">Follow-on Amount</div>
                <div className="text-white">{formatMoney(investment.followOnAmount)}</div>
              </div>
              <div>
                <div className="text-gray-400">Entry Valuation</div>
                <div className="text-white">{formatMoney(investment.entryValuation)}</div>
              </div>
              <div>
                <div className="text-gray-400">Investment Date</div>
                <div className="text-white">{formatDate(investment.investmentDate)}</div>
              </div>
              <div>
                <div className="text-gray-400">Last Valuation</div>
                <div className="text-white">{formatDate(investment.lastValuationDate)}</div>
              </div>
              {investment.notes && (
                <div className="col-span-3">
                  <div className="text-gray-400">Notes</div>
                  <div className="text-white">{investment.notes}</div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function InvestmentForm({
  investment,
  onSubmit,
  onCancel,
}: {
  investment?: Investment;
  onSubmit: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'totalInvested'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    companyName: investment?.companyName || '',
    stage: investment?.stage || 'discovery' as InvestmentStage,
    status: investment?.status || 'active' as InvestmentStatus,
    discoveryAmount: investment?.discoveryAmount || 100000,
    convictionAmount: investment?.convictionAmount || 0,
    followOnAmount: investment?.followOnAmount || 0,
    entryValuation: investment?.entryValuation || 0,
    currentValuation: investment?.currentValuation || 0,
    lastValuationDate: investment?.lastValuationDate || new Date().toISOString().split('T')[0],
    investmentDate: investment?.investmentDate || new Date().toISOString().split('T')[0],
    graduationDate: investment?.graduationDate || '',
    exitDate: investment?.exitDate || '',
    exitValue: investment?.exitValue || 0,
    notes: investment?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      graduationDate: formData.graduationDate || undefined,
      exitDate: formData.exitDate || undefined,
      exitValue: formData.exitValue || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">
          {investment ? 'Edit Investment' : 'Add Investment'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as InvestmentStage })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="discovery">Discovery</option>
                <option value="conviction">Conviction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as InvestmentStatus })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="active">Active</option>
                <option value="exited">Exited</option>
                <option value="written_off">Written Off</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Discovery ($)</label>
              <input
                type="number"
                value={formData.discoveryAmount}
                onChange={(e) => setFormData({ ...formData, discoveryAmount: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Conviction ($)</label>
              <input
                type="number"
                value={formData.convictionAmount}
                onChange={(e) => setFormData({ ...formData, convictionAmount: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Follow-on ($)</label>
              <input
                type="number"
                value={formData.followOnAmount}
                onChange={(e) => setFormData({ ...formData, followOnAmount: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry Valuation ($)</label>
              <input
                type="number"
                value={formData.entryValuation}
                onChange={(e) => setFormData({ ...formData, entryValuation: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Valuation ($)</label>
              <input
                type="number"
                value={formData.currentValuation}
                onChange={(e) => setFormData({ ...formData, currentValuation: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Investment Date</label>
              <input
                type="date"
                value={formData.investmentDate}
                onChange={(e) => setFormData({ ...formData, investmentDate: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Valuation Date</label>
              <input
                type="date"
                value={formData.lastValuationDate}
                onChange={(e) => setFormData({ ...formData, lastValuationDate: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          {formData.status === 'exited' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exit Date</label>
                <input
                  type="date"
                  value={formData.exitDate}
                  onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exit Value ($)</label>
                <input
                  type="number"
                  value={formData.exitValue}
                  onChange={(e) => setFormData({ ...formData, exitValue: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {investment ? 'Update' : 'Add'} Investment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ValuationForm({
  investment,
  onSubmit,
  onCancel,
}: {
  investment: Investment;
  onSubmit: (valuation: number, date: string, notes?: string) => void;
  onCancel: () => void;
}) {
  const [valuation, setValuation] = useState(investment.currentValuation);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(valuation, date, notes || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">
          Update Valuation: {investment.companyName}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Valuation</label>
            <div className="text-lg text-white mb-2">{formatMoney(investment.currentValuation)}</div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">New Valuation ($)</label>
            <input
              type="number"
              value={valuation}
              onChange={(e) => setValuation(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white h-20"
              placeholder="e.g., Series A round, new revenue data..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Update Valuation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
