import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Check, X, Minus, ArrowRight } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

/* ─── animation variants ─── */
const headerStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
}

const fadeSlideUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutExpo } },
}

const toggleFade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, delay: 0.4 } },
}

const cardSlideUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOutExpo } },
}

const cardStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
}

const tableRowStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
}

const tableRowFade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

const checkPop = {
  hidden: { scale: 0.8, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { duration: 0.2, ease: easeSpring } },
}

/* ─── data ─── */
const freeFeatures = [
  '3 adaptations de CV par mois',
  '1 clé API (OpenAI)',
  'Mode design conservé',
  'Téléchargement PDF',
  'Analyse de mots-clés basique',
]

const freeMissing = ['Mode ATS', 'Multi-IA (Claude, Kimi)', 'Support email']

const proFeatures = [
  'Adaptations de CV illimitées',
  'Multi-IA : OpenAI, Claude, Kimi AI',
  'Mode design conservé',
  'Mode ATS (normes recrutement)',
  'Extraction de mots-clés avancée',
  'Photo de profil : extraction + upload',
  'Téléchargement PDF haute qualité',
  'Support prioritaire par email',
]

const comparisonRows = [
  { feature: "Adaptations de CV", free: "3/mois", pro: "Illimité", freeCheck: false, proCheck: true },
  { feature: "Fournisseurs d'IA", free: "OpenAI uniquement", pro: "OpenAI, Claude, Kimi", freeCheck: false, proCheck: true },
  { feature: "Mode design conservé", free: true, pro: true },
  { feature: "Mode ATS", free: false, pro: true },
  { feature: "Extraction mots-clés", free: "Basique", pro: "Avancée", freeCheck: false, proCheck: true },
  { feature: "Photo de profil", free: false, pro: true },
  { feature: "Format de sortie", free: "PDF", pro: "PDF haute qualité", freeCheck: false, proCheck: true },
  { feature: "Support", free: false, pro: true },
]

/* ─── pulse glow (isolated micro-component) ─── */
function ProGlowPulse({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 8px 32px rgba(248,90,62,0.08)',
          '0 8px 40px rgba(248,90,62,0.18)',
          '0 8px 32px rgba(248,90,62,0.08)',
        ],
      }}
      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
      className="rounded-[20px]"
    >
      {children}
    </motion.div>
  )
}

/* ─── main page ─── */
export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="w-full" style={{ background: 'var(--off-white)' }}>
      {/* ── Section 1: Page Header ── */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pt-12 pb-12">
        <motion.div
          className="max-w-[640px] mx-auto text-center"
          variants={headerStagger}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={fadeSlideUp}
            className="text-small font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--coral)' }}
          >
            TARIFS
          </motion.p>

          <motion.h1
            variants={fadeSlideUp}
            className="text-section-mobile sm:text-section-tablet lg:text-section mt-3"
            style={{ color: 'var(--navy)' }}
          >
            Choisissez ce qui vous convient
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="text-body-large mt-4"
            style={{ color: 'var(--text-gray)' }}
          >
            Commencez gratuitement. Passez à Pro quand vous en avez besoin. Annulation à tout moment.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            variants={toggleFade}
            className="flex items-center justify-center gap-3 mt-8"
          >
            <span
              className="text-[15px] font-medium"
              style={{ color: !isYearly ? 'var(--navy)' : 'var(--text-gray)' }}
            >
              Mensuel
            </span>

            {/* Toggle switch */}
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-[48px] h-[26px] rounded-[13px] transition-colors duration-200 cursor-pointer"
              style={{ background: isYearly ? 'var(--coral)' : 'var(--mid-gray)' }}
              aria-label="Basculer facturation annuelle"
            >
              <motion.div
                className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white"
                animate={{ x: isYearly ? 22 : 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              />
            </button>

            <span
              className="text-[15px] font-medium"
              style={{ color: isYearly ? 'var(--navy)' : 'var(--text-gray)' }}
            >
              Annuel
            </span>

            <span
              className="text-small font-semibold px-2 py-0.5 rounded-[10px]"
              style={{ background: 'var(--coral-50)', color: 'var(--coral)' }}
            >
              -20%
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Section 2: Pricing Cards ── */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pb-20">
        <motion.div
          className="max-w-[800px] mx-auto flex flex-col md:flex-row gap-8"
          variants={cardStagger}
          initial="hidden"
          animate="show"
        >
          {/* ── Card 1: Gratuit ── */}
          <motion.div
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { duration: 0.3, ease: easeOutExpo } }}
            className="flex-1 rounded-[20px] p-8 md:p-10 transition-shadow duration-300 hover:shadow-card"
            style={{
              background: 'var(--white)',
              border: '1px solid var(--mid-gray)',
            }}
          >
            <h3 className="text-card-title" style={{ color: 'var(--navy)' }}>
              Gratuit
            </h3>

            <div className="flex items-baseline mt-4">
              <span className="text-[48px] font-bold leading-none" style={{ color: 'var(--navy)' }}>
                0€
              </span>
              <span className="text-body ml-1" style={{ color: 'var(--text-gray)' }}>
                /mois
              </span>
            </div>

            <p className="text-[15px] mt-2" style={{ color: 'var(--text-gray)' }}>
              Pour découvrir et adapter occasionnellement.
            </p>

            <hr className="my-6" style={{ borderColor: 'var(--mid-gray)' }} />

            {/* Included features */}
            <div className="flex flex-col gap-3.5">
              {freeFeatures.map((feat) => (
                <div key={feat} className="flex items-start gap-3">
                  <Check size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
                  <span className="text-[15px]" style={{ color: 'var(--dark-gray)' }}>
                    {feat}
                  </span>
                </div>
              ))}

              {/* Missing features */}
              {freeMissing.map((feat) => (
                <div key={feat} className="flex items-start gap-3" style={{ opacity: 0.5 }}>
                  <X size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--text-gray)' }} />
                  <span className="text-[15px]" style={{ color: 'var(--text-gray)' }}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/app"
              className="block w-full text-center text-button mt-8 py-3.5 px-7 rounded-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                border: '1.5px solid var(--navy)',
                color: 'var(--navy)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--navy)'
                e.currentTarget.style.color = 'var(--white)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--navy)'
              }}
            >
              Commencer gratuitement
            </Link>
          </motion.div>

          {/* ── Card 2: Pro (Featured) ── */}
          <motion.div
            variants={cardSlideUp}
            whileHover={{ y: -6, transition: { duration: 0.3, ease: easeOutExpo } }}
            className="flex-1 relative"
          >
            {/* RECOMMANDÉ badge */}
            <div
              className="absolute -top-3 right-6 z-10 text-small font-semibold px-3.5 py-1 rounded-[20px]"
              style={{ background: 'var(--coral)', color: 'var(--white)' }}
            >
              RECOMMANDÉ
            </div>

            <ProGlowPulse>
              <div
                className="rounded-[20px] p-8 md:p-10 transition-transform duration-300"
                style={{
                  background: 'var(--white)',
                  border: '2px solid var(--coral)',
                }}
              >
                <h3 className="text-card-title" style={{ color: 'var(--navy)' }}>
                  Pro
                </h3>

                <div className="flex items-baseline mt-4 flex-wrap gap-x-1">
                  {isYearly ? (
                    <>
                      <span className="text-body line-through" style={{ color: 'var(--text-gray)' }}>
                        9,90€
                      </span>
                      <span className="text-[48px] font-bold leading-none" style={{ color: 'var(--navy)' }}>
                        7,90€
                      </span>
                    </>
                  ) : (
                    <span className="text-[48px] font-bold leading-none" style={{ color: 'var(--navy)' }}>
                      9,90€
                    </span>
                  )}
                  <span className="text-body" style={{ color: 'var(--text-gray)' }}>
                    /mois
                  </span>
                </div>

                <p className="text-[15px] mt-2" style={{ color: 'var(--text-gray)' }}>
                  Pour les chercheurs d'emploi sérieux.
                </p>

                <hr className="my-6" style={{ borderColor: 'var(--mid-gray)' }} />

                <div className="flex flex-col gap-3.5">
                  {proFeatures.map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <Check size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
                      <span className="text-[15px]" style={{ color: 'var(--dark-gray)' }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full text-button text-white mt-8 py-3.5 px-7 rounded-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'var(--coral)',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--coral-dark)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(248,90,62,0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--coral)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  Passer Pro
                </button>
              </div>
            </ProGlowPulse>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Section 3: Feature Comparison Table ── */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pb-24">
        <motion.h2
          className="text-section-mobile sm:text-section-tablet lg:text-section text-center mb-10"
          style={{ color: 'var(--navy)' }}
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        >
          Comparaison détaillée
        </motion.h2>

        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--white)',
            border: '1px solid var(--mid-gray)',
          }}
          variants={tableRowStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px]"
            style={{ background: 'var(--navy-50)' }}
          >
            <div className="px-5 py-4 text-caption font-semibold" style={{ color: 'var(--text-gray)' }}>
              Fonctionnalité
            </div>
            <div className="px-5 py-4 text-caption font-semibold text-center" style={{ color: 'var(--navy)' }}>
              Gratuit
            </div>
            <div className="px-5 py-4 text-caption font-semibold text-center" style={{ color: 'var(--coral)' }}>
              Pro
            </div>
          </div>

          {/* Table Rows */}
          {comparisonRows.map((row, i) => {
            const bgAlt = i % 2 === 1 ? 'var(--off-white)' : 'var(--white)'
            return (
              <motion.div
                key={row.feature}
                variants={tableRowFade}
                className="grid grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px]"
                style={{
                  background: bgAlt,
                  borderBottom: '1px solid rgba(224,224,224,0.5)',
                }}
              >
                <div className="px-5 py-4 text-[15px]" style={{ color: 'var(--navy)' }}>
                  {row.feature}
                </div>
                <div className="px-5 py-4 flex items-center justify-center">
                  {typeof row.free === 'boolean' ? (
                    row.free ? (
                      <motion.div variants={checkPop}>
                        <Check size={18} style={{ color: 'var(--success)' }} />
                      </motion.div>
                    ) : (
                      <Minus size={18} style={{ color: 'var(--text-gray)', opacity: 0.4 }} />
                    )
                  ) : (
                    <span className="text-[14px]" style={{ color: 'var(--text-gray)' }}>
                      {row.free}
                    </span>
                  )}
                </div>
                <div className="px-5 py-4 flex items-center justify-center">
                  {typeof row.pro === 'boolean' ? (
                    <motion.div variants={checkPop}>
                      <Check size={18} style={{ color: 'var(--success)' }} />
                    </motion.div>
                  ) : (
                    <span className="text-[14px] font-medium" style={{ color: 'var(--success)' }}>
                      {row.pro}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── Section 4: FAQ Teaser ── */}
        <motion.div
          className="max-w-[640px] mx-auto text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <p className="text-body" style={{ color: 'var(--text-gray)' }}>
            Des questions ?{' '}
            <Link
              to="#"
              className="inline-flex items-center gap-1 transition-all duration-200 hover:underline"
              style={{ color: 'var(--coral)' }}
            >
              Consultez notre FAQ complète
              <ArrowRight size={14} />
            </Link>
          </p>
        </motion.div>
      </section>
    </div>
  )
}
