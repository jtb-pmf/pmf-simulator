'use client';

import { useState, useEffect, useCallback } from 'react';
import { FundParams, DEFAULT_FUND_PARAMS, MonteCarloResults, Investment } from '@/types';
import { runMonteCarloSimulation } from '@/lib/simulation';
import { FundConfig } from '@/components/FundConfig';
import { SimulationResults } from '@/components/SimulationResults';
import { Portfolio } from '@/components/Portfolio';
import { Play, BarChart2, Briefcase, Settings } from 'lucide-react';

type Tab = 'simulation' | 'portfolio' | 'config';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('simulation');
  const [params, setParams] = useState<FundParams>(DEFAULT_FUND_PARAMS);
  const [results, setResults] = useState<MonteCarloResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [numSimulations, setNumSimulations] = useState(5000);

  // Portfolio state (in-memory for now, will connect to Supabase)
  const [investments, setInvestments] = useState<Investment[]>([]);

  const runSimulation = useCallback(() => {
    setIsRunning(true);
    // Run in setTimeout to allow UI to update
    setTimeout(() => {
      const simulationResults = runMonteCarloSimulation(params, numSimulations);
      setResults(simulationResults);
      setIsRunning(false);
    }, 50);
  }, [params, numSimulations]);

  // Run simulation on mount
  useEffect(() => {
    runSimulation();
  }, []);

  const handleAddInvestment = (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'totalInvested'>) => {
    const newInvestment: Investment = {
      ...data,
      id: crypto.randomUUID(),
      totalInvested: data.discoveryAmount + data.convictionAmount + data.followOnAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvestments([...investments, newInvestment]);
  };

  const handleUpdateInvestment = (id: string, updates: Partial<Investment>) => {
    setInvestments(investments.map(inv => {
      if (inv.id === id) {
        const updated = { ...inv, ...updates, updatedAt: new Date().toISOString() };
        updated.totalInvested = updated.discoveryAmount + updated.convictionAmount + updated.followOnAmount;
        return updated;
      }
      return inv;
    }));
  };

  const handleDeleteInvestment = (id: string) => {
    if (confirm('Are you sure you want to delete this investment?')) {
      setInvestments(investments.filter(inv => inv.id !== id));
    }
  };

  const handleAddValuation = (investmentId: string, valuation: number, date: string) => {
    setInvestments(investments.map(inv => {
      if (inv.id === investmentId) {
        return {
          ...inv,
          currentValuation: valuation,
          lastValuationDate: date,
          updatedAt: new Date().toISOString(),
        };
      }
      return inv;
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PMF Fund Simulator</h1>
              <p className="text-sm text-gray-400">Monte Carlo analysis for VC fund outcomes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Simulations:</label>
                <select
                  value={numSimulations}
                  onChange={(e) => setNumSimulations(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                  <option value={25000}>25,000</option>
                </select>
              </div>
              <button
                onClick={runSimulation}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={16} />
                {isRunning ? 'Running...' : 'Run Simulation'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <TabButton
              active={activeTab === 'simulation'}
              onClick={() => setActiveTab('simulation')}
              icon={<BarChart2 size={16} />}
              label="Simulation"
            />
            <TabButton
              active={activeTab === 'portfolio'}
              onClick={() => setActiveTab('portfolio')}
              icon={<Briefcase size={16} />}
              label="Portfolio"
            />
            <TabButton
              active={activeTab === 'config'}
              onClick={() => setActiveTab('config')}
              icon={<Settings size={16} />}
              label="Configuration"
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'simulation' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <FundConfig params={params} onChange={setParams} />
            </div>
            <div className="lg:col-span-2">
              <SimulationResults results={results} isRunning={isRunning} />
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <Portfolio
            investments={investments}
            onAddInvestment={handleAddInvestment}
            onUpdateInvestment={handleUpdateInvestment}
            onDeleteInvestment={handleDeleteInvestment}
            onAddValuation={handleAddValuation}
          />
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl">
            <FundConfig params={params} onChange={setParams} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          PMF Fund Simulator &middot; Monte Carlo simulation for VC fund modeling
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? 'text-white border-b-2 border-blue-500'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
