import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Key, Users, FileText, BarChart3, Settings,
  LogOut, Eye, EyeOff, AlertTriangle, Loader2,
} from 'lucide-react'
import { getAdminStats, getAdminUsers, getMe, login, logout } from '../services/api'

interface AdminStats {
  totalUsers: number
  totalCVs: number
  totalOptimizations: number
  activeToday: number
}

interface AdminUserRow {
  email: string
  date: string
  cvs: number
  optimizations: number
}

/* ───────── easing ───────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ═════════════════════════════════════════════════════════════════
   Admin Dashboard
   ═════════════════════════════════════════════════════════════════ */
export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'api' | 'users'>('dashboard')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<AdminUserRow[]>([])
  const [serviceOk, setServiceOk] = useState<boolean | null>(null)

  const loadAdminData = async () => {
    const [statsResult, usersResult, health] = await Promise.all([
      getAdminStats(),
      getAdminUsers(),
      fetch('/api/health').then(r => r.ok).catch(() => false),
    ])
    setStats(statsResult.stats)
    setServiceOk(health)
    setRecentUsers(usersResult.users.map((user) => ({
      email: user.email,
      date: new Date(user.createdAt).toISOString().slice(0, 10),
      cvs: user._count.documents,
      optimizations: user._count.generations,
    })))
  }

  /* session existante → connexion directe */
  useEffect(() => {
    getMe()
      .then((result) => {
        if (result.user.role === 'ADMIN') {
          setAdminEmail(result.user.email)
          setIsLoggedIn(true)
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false))
  }, [])

  const handleLogin = async () => {
    try {
      const result = await login(loginEmail, loginPassword)
      if (result.user.role !== 'ADMIN') {
        setLoginError('Acces admin requis')
        return
      }
      setAdminEmail(result.user.email)
      setIsLoggedIn(true)
      setLoginError('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Email ou mot de passe incorrect')
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadAdminData().catch(() => setLoginError('Impossible de charger les donnees admin'))
    }
  }, [isLoggedIn])

  /* ═══════ Session check ═══════ */
  if (checkingSession) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    )
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
            onClick={() => {
              logout().finally(() => setIsLoggedIn(false))
            }}
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
              {(adminEmail[0] || 'A').toUpperCase()}
            </div>
            <span className="text-sm text-navy font-medium">{adminEmail}</span>
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
                { label: 'Utilisateurs', value: stats?.totalUsers, icon: Users, color: '#3B82F6' },
                { label: 'CV importés', value: stats?.totalCVs, icon: FileText, color: '#10B981' },
                { label: 'Optimisations', value: stats?.totalOptimizations, icon: BarChart3, color: 'var(--coral)' },
                { label: 'Actifs aujourd\'hui', value: stats?.activeToday, icon: Shield, color: '#8B5CF6' },
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
                  <p className="text-2xl font-bold text-navy">{stat.value === undefined ? '—' : stat.value.toLocaleString()}</p>
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
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-sm text-text-gray text-center">Aucun utilisateur pour le moment.</td>
                      </tr>
                    )}
                    {recentUsers.map((user, i) => (
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
            {/* AI API Key info */}
            <div className="bg-white border border-mid-gray rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,90,62,0.1)' }}>
                  <Key size={20} style={{ color: 'var(--coral)' }} />
                </div>
                <div>
                  <h3 className="text-subsection text-navy">Configuration IA</h3>
                  <p className="text-xs text-text-gray">Configuration côté serveur</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Settings size={14} className="text-text-gray mt-0.5 shrink-0" />
                <p className="text-xs text-text-gray">
                  L'optimisation utilise OpenAI (<code className="font-mono bg-light-gray px-1 rounded">OPENAI_MODEL</code>).
                  La clé <code className="font-mono bg-light-gray px-1 rounded">OPENAI_API_KEY</code> reste côté serveur et n'est jamais exposée aux utilisateurs.
                  Pour la changer, mettez à jour le <code className="font-mono bg-light-gray px-1 rounded">.env</code> et redémarrez le serveur.
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white border border-mid-gray rounded-xl p-6">
              <h3 className="text-subsection text-navy mb-4">État du service</h3>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${serviceOk === null ? 'bg-gray-300' : serviceOk ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-navy font-medium">
                  {serviceOk === null ? 'API — Vérification…' : serviceOk ? 'API — Opérationnelle' : 'API — Injoignable'}
                </span>
              </div>
              <p className="text-xs text-text-gray mt-2">
                {serviceOk === false
                  ? "Le serveur API ne répond pas. Vérifiez qu'il est démarré."
                  : 'Statut basé sur la disponibilité du serveur API.'}
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
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3 pr-4">Optimisations</th>
                      <th className="text-left text-xs font-semibold text-text-gray uppercase tracking-wider pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-sm text-text-gray text-center">Aucun utilisateur pour le moment.</td>
                      </tr>
                    )}
                    {recentUsers.map((user, i) => (
                      <tr key={i} className="border-b border-light-gray last:border-0">
                        <td className="py-3 pr-4 text-sm text-navy">{user.email}</td>
                        <td className="py-3 pr-4 text-sm text-text-gray">{user.date}</td>
                        <td className="py-3 pr-4 text-sm text-navy font-medium">{user.cvs}</td>
                        <td className="py-3 pr-4 text-sm text-navy font-medium">{user.optimizations}</td>
                        <td className="py-3">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-600">
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
