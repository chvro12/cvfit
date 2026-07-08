import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Loader2, Mail, Lock, User, Star
} from 'lucide-react'
import { getMe, login, register } from '../services/api'

/* ───────── easing ───────── */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]
const easeSpring = { type: 'spring' as const, stiffness: 300, damping: 25 }

/* ───────── types ───────── */
interface FormData {
  name: string
  email: string
  password: string
  terms: boolean
}

/* ───────── password strength ───────── */
function calcStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const strengthLabels = ['Faible', 'Moyenne', 'Bonne', 'Forte']
const strengthColors = ['#EF4444', '#F59E0B', '#10B981', '#10B981']

/* ───────── form input ───────── */
const FormInput = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  isPassword,
  showPassword,
  onTogglePassword,
  delay,
}: {
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  isPassword?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
  delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: delay || 0 }}
    className="mb-5"
  >
    <div className="flex justify-between items-center mb-1.5">
      <label className="text-sm font-medium text-[#0B1D3A]">{label}</label>
      {isPassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="text-[#6B7280] hover:text-[#374151] transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
    <motion.div
      animate={error ? { x: [0, -4, 4, -4, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" />
        <input
          type={isPassword && !showPassword ? 'password' : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-[1.5px] text-[#0B1D3A] placeholder:text-[#6B7280]/60 outline-none transition-all
            ${error ? 'border-[#EF4444] focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' 
                    : 'border-[#E0E0E0] focus:border-[#F85A3E] focus:shadow-[0_0_0_3px_rgba(248,90,62,0.15)]'}`}
        />
      </div>
    </motion.div>
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-[#EF4444] mt-1.5"
      >
        {error}
      </motion.p>
    )}
  </motion.div>
)

/* ───────── password strength bar ───────── */
const PasswordStrengthBar = ({ password }: { password: string }) => {
  const strength = calcStrength(password)
  if (!password) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-5"
    >
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < strength ? strengthColors[strength - 1] : '#E0E0E0' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: strengthColors[strength - 1] }}>
        Force : {strengthLabels[strength - 1]}
      </p>
    </motion.div>
  )
}

/* ───────── login form ───────── */
const LoginForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = useCallback(() => {
    const e: Record<string, string> = {}
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Veuillez entrer une adresse email valide'
    if (!password) e.password = 'Le mot de passe est requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [email, password])

  const handleSubmit = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app')
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Connexion impossible' })
    } finally {
      setLoading(false)
    }
  }, [validate, email, password, navigate])

  return (
    <motion.form
      key="login"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.3, ease: easeOutExpo }}
      onSubmit={handleSubmit}
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-[32px] font-bold text-[#0B1D3A] mb-2">Bon retour !</h2>
        <p className="text-[#6B7280] mb-8">Connectez-vous pour accéder à vos CV adapt&eacute;s.</p>
      </motion.div>

      <FormInput label="Adresse email" type="email" placeholder="vous@exemple.fr"
        value={email} onChange={setEmail} error={errors.email} icon={Mail} delay={0.06} />
      <FormInput label="Mot de passe" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
        value={password} onChange={setPassword} error={errors.password} icon={Lock}
        isPassword showPassword={showPw} onTogglePassword={() => setShowPw(!showPw)} delay={0.12} />
      {errors.form && <p className="mb-4 text-sm text-[#EF4444]">{errors.form}</p>}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#F85A3E] hover:bg-[#E04A2F] text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Se connecter'}
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mt-6 text-sm text-[#6B7280]"
      >
        Pas encore de compte ?{' '}
        <button type="button" onClick={onSwitch} className="text-[#F85A3E] font-medium hover:underline">
          Cr&eacute;er un compte
        </button>
      </motion.p>
    </motion.form>
  )
}

/* ───────── register form ───────── */
const RegisterForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({ name: '', email: '', password: '', terms: false })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const validate = useCallback(() => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Le prénom est requis'
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Veuillez entrer une adresse email valide'
    if (!form.password) e.password = 'Le mot de passe est requis'
    else if (form.password.length < 8) e.password = 'Le mot de passe doit contenir au moins 8 caractères'
    if (!form.terms) e.terms = 'Vous devez accepter les conditions'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  const handleSubmit = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/app')
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Inscription impossible' })
    } finally {
      setLoading(false)
    }
  }, [validate, form, navigate])

  return (
    <motion.form
      key="register"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.3, ease: easeOutExpo }}
      onSubmit={handleSubmit}
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-[32px] font-bold text-[#0B1D3A] mb-2">Cr&eacute;ez votre compte</h2>
        <p className="text-[#6B7280] mb-8">Commencez gratuitement. Aucune carte bancaire requise.</p>
      </motion.div>

      <FormInput label="Pr&eacute;nom" placeholder="Jean"
        value={form.name} onChange={(v) => update('name', v)} error={errors.name} icon={User} delay={0.06} />
      <FormInput label="Adresse email" type="email" placeholder="vous@exemple.fr"
        value={form.email} onChange={(v) => update('email', v)} error={errors.email} icon={Mail} delay={0.12} />
      <FormInput label="Mot de passe" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
        value={form.password} onChange={(v) => update('password', v)} error={errors.password} icon={Lock}
        isPassword showPassword={showPw} onTogglePassword={() => setShowPw(!showPw)} delay={0.18} />

      <PasswordStrengthBar password={form.password} />
      {errors.form && <p className="mb-4 text-sm text-[#EF4444]">{errors.form}</p>}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="mb-6"
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => update('terms', !form.terms)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
              ${form.terms ? 'bg-[#F85A3E] border-[#F85A3E]' : 'border-[#E0E0E0]'}`}
          >
            {form.terms && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-sm text-[#374151]">
            J&apos;accepte les Conditions d&apos;utilisation et la Politique de confidentialit&eacute;.
          </span>
        </label>
        {errors.terms && <p className="text-sm text-[#EF4444] mt-1">{errors.terms}</p>}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#F85A3E] hover:bg-[#E04A2F] text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Cr&eacute;er mon compte'}
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center mt-6 text-sm text-[#6B7280]"
      >
        D&eacute;j&agrave; un compte ?{' '}
        <button type="button" onClick={onSwitch} className="text-[#F85A3E] font-medium hover:underline">
          Se connecter
        </button>
      </motion.p>
    </motion.form>
  )
}

/* ───────── left panel ───────── */
const LeftPanel = () => (
  <div className="hidden lg:flex lg:w-[45%] bg-[#0B1D3A] flex-col justify-between p-16 relative overflow-hidden">
    {/* Subtle geometric pattern */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }} />

    <div className="relative z-10">
      <div className="text-[28px] font-bold text-white mb-8">
        CV<span className="text-[#F85A3E]">Fit</span>
      </div>
      <p className="text-lg leading-relaxed max-w-[360px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
        Adaptez votre CV &agrave; chaque offre d&apos;emploi en quelques secondes.
      </p>
    </div>

    <div className="relative z-10">
      <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 max-w-[360px]">
        <p className="text-[15px] text-white italic mb-4 leading-relaxed">
          &ldquo;J&apos;ai adapt&eacute; mon CV pour 15 offres en une heure. L&apos;optimisation ATS m&apos;a fait passer le filtre des logiciels de recrutement.&rdquo;
        </p>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={14} className="text-[#F85A3E]" fill="#F85A3E" />
          ))}
        </div>
        <p className="text-sm font-semibold text-white">Thomas D.</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>D&eacute;veloppeur Full Stack</p>
      </div>
    </div>
  </div>
)

/* ───────── main auth page ───────── */
export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const isLogin = mode === 'login'

  /* deja connecte → direct vers l'app */
  useEffect(() => {
    getMe().then(() => navigate('/app')).catch(() => {})
  }, [navigate])

  return (
    <div className="min-h-[100dvh] flex">
      <LeftPanel />

      <div className="flex-1 lg:w-[55%] bg-white flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-bold text-[#0B1D3A]">
              CV<span className="text-[#F85A3E]">Fit</span>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-[#F5F5F5] rounded-xl p-1 mb-8 relative">
            <motion.div
              className="absolute top-1 bottom-1 bg-white rounded-[10px] shadow-sm"
              initial={false}
              animate={{ left: isLogin ? '4px' : '50%', width: 'calc(50% - 4px)' }}
              transition={easeSpring}
            />
            <button
              onClick={() => setMode('login')}
              className={`flex-1 relative z-10 py-3 text-[15px] font-medium rounded-[10px] transition-colors
                ${isLogin ? 'text-[#0B1D3A] font-semibold' : 'text-[#6B7280]'}`}
            >
              Se connecter
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 relative z-10 py-3 text-[15px] font-medium rounded-[10px] transition-colors
                ${!isLogin ? 'text-[#0B1D3A] font-semibold' : 'text-[#6B7280]'}`}
            >
              Cr&eacute;er un compte
            </button>
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <LoginForm key="login" onSwitch={() => setMode('register')} />
            ) : (
              <RegisterForm key="register" onSwitch={() => setMode('login')} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
