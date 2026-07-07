import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Key, Users, FileText, BarChart3, Settings,
  LogOut, Eye, EyeOff, Check, AlertTriangle,
} from 'lucide-react'

/* ───────── mock data ───────── */
const ADMIN_CREDENTIALS = {
  email: 'sambathiampro@icloud.com',
  password: 'Mamecodou1@@',
}

const MOCK_STATS = {
  totalUsers: 1247,
  totalCVs: 3892,
  totalOptimizations: 5621,
  activeToday: 89,
}

const MOCK_RECENT_USERS = [
  { email: 'jean.dupont@email.fr', date: '2025-07-08', cvs: 3 },
  { email: 'marie.leroy@email.fr', date: '2025-07-08', cvs: 1 },
  { email: 'thomas.martin@email.fr', date: '2025-07-07', cvs: 5 },
  { email: 'sarah.kane@email.fr', date: '2025-07-07', cvs: 2 },
  { email: 'alex.dubois@email.fr', date: '2025-07-06', cvs: 1 },
]

/* ───────── easing ───────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ═════════════════════════════════════════════════════════════════
   Admin Dashboard
   ═════════════════════════════════════════════════════════════════ */
export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'api' | 'users'>('dashboard')

  /* ── Kimi API config ── */
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const handleLogin = () => {
    if (loginEmail === ADMIN_CREDENTIALS.email && loginPassword === ADMIN_CREDENTIALS.password) {
      setIsLoggedIn(true)
      setLoginError('')
    } else {
      setLoginError('Email ou mot de passe incorrect')
    }
  }

  const handleSaveApiKey = () => {
    if (kimiApiKey.trim().length >= 20) {
      setApiKeySaved(true)
      setTimeout(() => setApiKeySaved(false), 3000)
    }
  }

  /* ═══════ Login Screen ═══════ */
  if (!isLoggedIn) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="w-full max-w-[420px] mx-4"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-white mb-2">
              CV<span style={{ color: 'var(--coral)' }}>Fit</span>
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Administration
            </p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold text-navy mb-1">Connexion admin</h2>
            <p className="text-sm text-text-gray mb-6">Accès réservé aux administrateurs</p>

            {loginError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{loginError}</p>
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@cvfit.fr"
                className="w-full border-[1.5px] border-mid-gray rounded-xl px-4 py-3 text-navy outline-none focus:border-coral transition-colors"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-[1.5px] border-mid-gray rounded-xl px-4 py-3 pr-12 text-navy outline-none focus:border-coral transition-colors"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-gray hover:text-navy"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'var(--coral)' }}
            >
              Se connecter
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ═══════ Admin Dashboard ═══════ */
  return (
    <div className="min-h-[100dvh] flex" style={{ background: 'var(--off-white)' }}>
      {/* Sidebar */}
      <aside className="w-[260px] min-w-[260px] bg-white border-r border-mid-gray flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-mid-gray">
          <h1 className="text-lg font-bold text-navy">
            CV<span style={{ color: 'var(--coral)' }}>Fit</span>
          </h1>
          <p className="text-xs text-text-gray">Administration</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all duration-200"
            style={{
              background: activeTab === 'dashboard' ? 'var(--coral-50)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--navy)' : 'var(--text-gray)',
            }}
          >
            <BarChart3 size={18} />
            <span className="text-sm font-medium">Tableau de bord</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all duration-200 mt-1"
            style={{
              background: activeTab === 'api' ? 'var(--coral-50)' : 'transparent',
              color: activeTab === 'api' ? 'var(--navy)' : 'var(--text-gray)',
            }}
          >
            <Key size={18} />
            <span className="text-sm font-medium">Configuration IA</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all duration-200 mt-1"
            style={{
              background: activeTab === 'users' ? 'var(--coral-50)' : 'transparent',
              color: activeTab === 'users' ? 'var(--navy)' : 'var(--text-gray)',
            }}
          >
            <Users size={18} />
            <span className="text-sm font-medium">Utilisateurs</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-mid-gray">
          <button
            onClick={() => setIsLoggedIn(false)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-text-gray hover:bg-light-gray transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-navy">
            {activeTab === 'dashboard' && 'Tableau de bord'}
            {activeTab === 'api' && 'Configuration IA'}
            {activeTab === 'users' && 'Utilisateurs'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: 'var(--coral)' }}>
              S
            </div>
            <span className="text-sm text-navy font-medium">sambathiampro@icloud.com</span>
          </div>
        </div>

        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Utilisateurs', value: MOCK_STATS.totalUsers, icon: Users, color: '#3B82F6' },
                { label: 'CV créés', value: MOCK_STATS.totalCVs, icon: FileText, color: '#10B981' },
                { label: 'Optimisations', value: MOCK_STATS.totalOptimizations, icon: BarChart3, color: 'var(--coral)' },
                { label: 'Actifs aujourd\'hui', value: MOCK_STATS.activeToday, icon: Shield, color: '#8B5CF6' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35, ease: easeOutExpo }}
                  className="bg-white border border-mid-gray rounded-xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                      <stat.icon size={20} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-navy">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-text-gray">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="bg-white border border-mid-gray rounded-xl p-6">
              <h3 className="text-subsection text-navy mb-4">Activité récente</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-mid-gray">
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3 pr-4">Email</th>
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3 pr-4">Date</th>
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3">CVs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RECENT_USERS.map((user, i) => (
                      <tr key={i} className="border-b border-light-gray last:border-0">
                        <td className="py-3 pr-4 text-sm text-navy">{user.email}</td>
                        <td className="py-3 pr-4 text-sm text-text-gray">{user.date}</td>
                        <td className="py-3 text-sm text-navy font-medium">{user.cvs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── API Config Tab ── */}
        {activeTab === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-[600px]"
          >
            {/* Kimi API Key */}
            <div className="bg-white border border-mid-gray rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,90,62,0.1)' }}>
                  <Key size={20} style={{ color: 'var(--coral)' }} />
                </div>
                <div>
                  <h3 className="text-subsection text-navy">Clé API Kimi</h3>
                  <p className="text-xs text-text-gray">Configurez la clé API pour l'optimisation IA</p>
                </div>
              </div>

              <div className="relative mb-4">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={kimiApiKey}
                  onChange={(e) => setKimiApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full border-[1.5px] border-mid-gray rounded-xl py-3 pl-4 pr-24 text-navy outline-none focus:border-coral transition-colors font-mono text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {apiKeySaved && <Check size={18} className="text-green-500" />}
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 rounded-lg hover:bg-light-gray text-text-gray"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Settings size={14} className="text-text-gray" />
                <p className="text-xs text-text-gray">
                  Cette clé est utilisée côté serveur et n'est jamais exposée aux utilisateurs.
                </p>
              </div>

              <button
                onClick={handleSaveApiKey}
                className="text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'var(--coral)' }}
              >
                {apiKeySaved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>

            {/* Status */}
            <div className="bg-white border border-mid-gray rounded-xl p-6">
              <h3 className="text-subsection text-navy mb-4">État du service</h3>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-navy font-medium">Kimi AI — Opérationnel</span>
              </div>
              <p className="text-xs text-text-gray mt-2">
                Le service d'optimisation IA est actif et fonctionne normalement.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Users Tab ── */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white border border-mid-gray rounded-xl p-6">
              <h3 className="text-subsection text-navy mb-4">Liste des utilisateurs</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-mid-gray">
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3 pr-4">Email</th>
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3 pr-4">Inscription</th>
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3 pr-4">CVs</th>
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RECENT_USERS.map((user, i) => (
                      <tr key={i} className="border-b border-light-gray last:border-0">
                        <td className="py-3 pr-4 text-sm text-navy">{user.email}</td>
                        <td className="py-3 pr-4 text-sm text-text-gray">{user.date}</td>
                        <td className="py-3 pr-4 text-sm text-navy font-medium">{user.cvs}</td>
                        <td className="py-3">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 font-medium">
                            Actif
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
