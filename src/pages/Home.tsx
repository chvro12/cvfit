import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { motion, useInView } from 'framer-motion'
import {
  Star,
  ChevronDown,
  CheckCircle,
  Cpu,
  FileCheck,
  Image,
} from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

/* ─── Section 2: Hero ─── */
function HeroSection() {
  return (
    <section
      className="relative min-h-[100dvh] flex items-center overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
      />
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(11,29,58,0.93) 0%, rgba(11,29,58,0.80) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-content mx-auto px-6 lg:px-12 w-full py-5xl">
        <div className="max-w-[700px] text-center sm:text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: easeSpring }}
            className="inline-block mb-6"
          >
            <span
              className="text-small font-semibold px-4 py-1.5 rounded-[20px]"
              style={{
                background: 'rgba(248,90,62,0.15)',
                border: '1px solid rgba(248,90,62,0.3)',
                color: 'var(--coral)',
              }}
            >
              GRATUIT POUR COMMENCER
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: easeOutExpo }}
            className="text-hero-mobile sm:text-hero-tablet lg:text-hero text-white leading-tight"
          >
            Votre CV, parfaitement adapté à chaque offre d'emploi
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: easeOutExpo }}
            className="text-body-large mt-5 max-w-[560px] mx-auto sm:mx-0"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Collez une offre d'emploi, uploadez votre CV, et laissez l'IA faire
            le reste. Vos mots-clés sont extraits, votre contenu est réécrit,
            puis votre CV est reconstruit dans un format clair et lisible par les ATS.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0, ease: easeOutExpo }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              to="/app"
              className="text-button text-white px-7 py-3.5 rounded-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto text-center"
              style={{
                background: 'var(--coral)',
                boxShadow: '0 4px 16px rgba(248,90,62,0.35)',
              }}
            >
              Adapter mon CV gratuitement
            </Link>
            <a
              href="#tarifs"
              className="text-button text-white px-7 py-3.5 rounded-[12px] transition-all duration-200 w-full sm:w-auto text-center"
              style={{
                border: '1.5px solid rgba(255,255,255,0.4)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
              }}
            >
              Voir les tarifs
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.2, ease: easeOutExpo }}
            className="mt-12 flex items-center justify-center sm:justify-start gap-2"
          >
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill="var(--coral)"
                  color="var(--coral)"
                />
              ))}
            </div>
            <span
              className="text-caption"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              4.8/5 — +12 000 CVs adaptés
            </span>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <ChevronDown
          size={24}
          className="animate-bounce-chevron"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        />
      </motion.div>
    </section>
  )
}

/* ─── Section 3: How It Works ─── */
function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  const steps = [
    {
      num: 1,
      title: 'Uploadez votre CV',
      desc: 'Importez votre CV au format PDF ou DOCX. Son contenu est extrait et restructuré dans un modèle optimisé ATS.',
      icon: '/step-upload.svg',
    },
    {
      num: 2,
      title: "Collez l'offre",
      desc: "Copiez-collez le texte de l'offre d'emploi. Notre IA en extrait les mots-clés et compétences attendues.",
      icon: '/step-paste.svg',
    },
    {
      num: 3,
      title: "L'IA s'occupe du reste",
      desc: 'En quelques secondes, l\'IA propose des reformulations ciblées. Vous validez chaque changement avant de continuer.',
      icon: '/step-ai.svg',
    },
    {
      num: 4,
      title: 'Téléchargez & postulez',
      desc: 'Récupérez votre CV adapté au format PDF. Prêt à être envoyé au recruteur.',
      icon: '/step-download.svg',
    },
  ]

  return (
    <section
      id="comment-ca-marche"
      className="py-4xl sm:py-[96px]"
      style={{ background: 'var(--off-white)' }}
    >
      <div className="max-w-content mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div ref={ref} className="text-center mb-12 sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: easeOutExpo }}
            className="text-small font-semibold uppercase tracking-[0.1em] mb-3"
            style={{ color: 'var(--coral)' }}
          >
            COMMENT ÇA MARCHE
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease: easeOutExpo }}
            className="text-section-mobile sm:text-section-tablet lg:text-section text-navy"
          >
            Quatre étapes, zéro prise de tête
          </motion.h2>
        </div>

        {/* Steps Grid */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.12 * (i + 1),
                ease: easeOutExpo,
              }}
              className="relative bg-white border border-mid-gray rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-card group"
              style={{
                borderColor: undefined,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(248,90,62,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--mid-gray)'
              }}
            >
              {/* Step Number Badge */}
              <div
                className="absolute -top-[18px] left-7 w-9 h-9 rounded-full flex items-center justify-center text-white text-base font-bold"
                style={{ background: 'var(--coral)' }}
              >
                {step.num}
              </div>

              {/* Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.4,
                  delay: 0.12 * (i + 1) + 0.2,
                  ease: easeOutExpo,
                }}
                className="mb-4 mt-2"
              >
                <img
                  src={step.icon}
                  alt={step.title}
                  className="w-16 h-16 object-contain"
                />
              </motion.div>

              {/* Title */}
              <h3 className="text-subsection text-navy mb-2">{step.title}</h3>

              {/* Description */}
              <p className="text-body-large" style={{ color: 'var(--dark-gray)' }}>
                {step.desc}
              </p>
            </motion.div>
          ))}

          {/* Connecting lines (desktop only) */}
          <div className="hidden lg:block absolute top-[60px] left-[25%] right-[25%] h-[2px]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5, ease: easeOutExpo }}
              className="w-full h-full origin-left"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, var(--mid-gray) 0, var(--mid-gray) 8px, transparent 8px, transparent 16px)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Section 4: Features ─── */
function FeaturesSection() {
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)
  const isInView1 = useInView(ref1, { once: true, amount: 0.15 })
  const isInView2 = useInView(ref2, { once: true, amount: 0.15 })

  const featuresList = [
    'Mots-clés extraits automatiquement de l\'offre',
    'Contenu enrichi et aligné sur l\'offre pour améliorer la correspondance',
    'Chaque modification validée par vous, une par une',
    'Score ATS avant / après pour mesurer le gain',
  ]

  const featureCards = [
    {
      title: 'Optimisation IA',
      desc: "L'IA analyse l'offre et chaque section de votre CV, puis propose des améliorations ciblées. Vous approuvez ou rejetez chaque changement.",
      icon: Cpu,
    },
    {
      title: 'PDF lisible par les ATS',
      desc: 'Export PDF en vrai texte (pas une image) : votre CV reste lisible par les logiciels de recrutement.',
      icon: FileCheck,
    },
    {
      title: 'Photo de profil',
      desc: 'Ajoutez une photo et choisissez sa position dans l\'éditeur : en haut, à gauche ou à droite.',
      icon: Image,
    },
  ]

  return (
    <section className="py-4xl sm:py-[96px] bg-white">
      <div className="max-w-content mx-auto px-6 lg:px-12">
        {/* Row 1: Feature Highlight (Split) */}
        <div
          ref={ref1}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left column */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={isInView1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: easeOutExpo }}
              className="text-small font-semibold uppercase tracking-[0.1em] mb-3"
              style={{ color: 'var(--coral)' }}
            >
              FONCTIONNALITÉS CLÉS
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 25 }}
              animate={isInView1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1, ease: easeOutExpo }}
              className="text-section-mobile sm:text-section-tablet lg:text-section text-navy mb-5"
            >
              Un CV plus clair, plus ciblé et plus lisible par les ATS.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={isInView1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15, ease: easeOutExpo }}
              className="text-body-large mb-6"
              style={{ color: 'var(--dark-gray)' }}
            >
              CVFit extrait le contenu utile de votre CV, le compare à l'offre
              et vous aide à reconstruire une version propre, ciblée et facile
              à relire avant l'envoi.
            </motion.p>

            {/* Feature list */}
            <div className="flex flex-col gap-3">
              {featuresList.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={isInView1 ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.4,
                    delay: 0.2 + i * 0.08,
                    ease: easeOutExpo,
                  }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle
                    size={20}
                    className="shrink-0"
                    style={{ color: 'var(--success)' }}
                  />
                  <span className="text-body-large" style={{ color: 'var(--dark-gray)' }}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right column: CV Preview cards */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Before card */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={isInView1 ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15, ease: easeOutExpo }}
              className="relative z-10 rounded-xl overflow-hidden shadow-card bg-white"
              style={{ width: '280px', border: '1px solid var(--mid-gray)' }}
            >
              <img
                src="/cv-preview-before.jpg"
                alt="CV avant adaptation"
                className="w-full h-auto"
              />
              <div className="px-3 py-2 text-center text-small" style={{ color: 'var(--text-gray)' }}>
                Avant
              </div>
            </motion.div>

            {/* After card */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={isInView1 ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3, ease: easeOutExpo }}
              className="absolute z-20 rounded-xl overflow-hidden shadow-card bg-white"
              style={{
                width: '280px',
                borderLeft: '4px solid var(--coral)',
                borderTop: '1px solid var(--mid-gray)',
                borderRight: '1px solid var(--mid-gray)',
                borderBottom: '1px solid var(--mid-gray)',
                top: '16px',
                left: 'calc(50% - 100px)',
              }}
            >
              <div
                className="absolute top-2 right-2 text-small font-semibold px-3 py-1 rounded-full"
                style={{
                  background: 'var(--coral)',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                Après adaptation
              </div>
              <img
                src="/cv-preview-after.jpg"
                alt="CV après adaptation"
                className="w-full h-auto"
              />
              <div className="px-3 py-2 text-center text-small font-medium" style={{ color: 'var(--coral)' }}>
                Après
              </div>
            </motion.div>
          </div>
        </div>

        {/* Row 2: Feature Grid (3 columns) */}
        <div
          ref={ref2}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16 sm:mt-[64px]"
        >
          {featureCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 35 }}
                animate={isInView2 ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.1 * (i + 1),
                  ease: easeOutExpo,
                }}
                className="bg-white border border-mid-gray rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-card group"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(248,90,62,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--mid-gray)'
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-200"
                  style={{ background: 'var(--coral-50)' }}
                >
                  <Icon size={24} style={{ color: 'var(--coral)' }} />
                </div>
                <h3 className="text-card-title text-navy mb-2">{card.title}</h3>
                <p className="text-body" style={{ color: 'var(--dark-gray)' }}>
                  {card.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Section 5: Testimonials ─── */
function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  const testimonials = [
    {
      quote:
        "J'ai adapté mon CV pour 15 offres en une heure. J'ai eu 3 retours la semaine suivante. Avant, je passais des heures à tout réécrire à la main.",
      author: 'Marie L.',
      detail: 'Chargée de communication',
    },
    {
      quote:
        "Le score ATS avant / après est génial. Mon CV passait systématiquement à la trappe des logiciels de recrutement. Maintenant j'ai confiance.",
      author: 'Thomas D.',
      detail: 'Développeur Full Stack',
    },
    {
      quote:
        "Simple, rapide, et le résultat est propre. J'ai validé les modifications une par une et le contenu était parfaitement aligné avec l'offre.",
      author: 'Sarah K.',
      detail: 'Chef de projet marketing',
    },
  ]

  return (
    <section
      className="py-4xl sm:py-[96px]"
      style={{ background: 'var(--navy-50)' }}
    >
      <div className="max-w-content mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div ref={ref} className="text-center mb-12 sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: easeOutExpo }}
            className="text-small font-semibold uppercase tracking-[0.1em] mb-3"
            style={{ color: 'var(--coral)' }}
          >
            TÉMOIGNAGES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease: easeOutExpo }}
            className="text-section-mobile sm:text-section-tablet lg:text-section text-navy"
          >
            Ils ont décroché leur entretien
          </motion.h2>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.12 * (i + 1),
                ease: easeOutExpo,
              }}
              className="bg-white border border-mid-gray rounded-2xl p-8 transition-all duration-300 hover:-translate-y-[3px]"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(248,90,62,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--mid-gray)'
              }}
            >
              {/* Quote */}
              <p
                className="text-body italic mb-5 leading-relaxed"
                style={{ color: 'var(--dark-gray)' }}
              >
                "{t.quote}"
              </p>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    size={14}
                    fill="var(--coral)"
                    color="var(--coral)"
                  />
                ))}
              </div>

              {/* Author */}
              <p className="text-caption font-semibold text-navy">{t.author}</p>
              <p className="text-small" style={{ color: 'var(--text-gray)' }}>
                {t.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Section 6: Pricing Teaser ─── */
function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <section id="tarifs" className="py-4xl sm:py-[96px] bg-white">
      <div className="max-w-content mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div ref={ref} className="text-center mb-12 sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: easeOutExpo }}
            className="text-small font-semibold uppercase tracking-[0.1em] mb-3"
            style={{ color: 'var(--coral)' }}
          >
            TARIFS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease: easeOutExpo }}
            className="text-section-mobile sm:text-section-tablet lg:text-section text-navy mb-3"
          >
            Commencez gratuitement
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: easeOutExpo }}
            className="text-body-large"
            style={{ color: 'var(--text-gray)' }}
          >
            Toutes les fonctionnalités essentielles sont disponibles pendant la phase de lancement.
          </motion.p>
        </div>

        <div className="max-w-[520px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: easeOutExpo }}
            className="bg-white border border-mid-gray rounded-[20px] p-8 sm:p-10 flex flex-col"
          >
            <h3 className="text-card-title text-navy mb-2">Gratuit</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-navy" style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>
                0€
              </span>
              <span className="text-body" style={{ color: 'var(--text-gray)' }}>
                /mois
              </span>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {[
                'Adaptations de CV disponibles',
                'Optimisation IA (OpenAI)',
                'Score ATS avant / après',
                'Export PDF texte (ATS-friendly)',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle
                    size={18}
                    className="shrink-0"
                    style={{ color: 'var(--success)' }}
                  />
                  <span className="text-body" style={{ color: 'var(--dark-gray)' }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/app"
              className="text-button text-navy px-7 py-3.5 rounded-[12px] text-center transition-all duration-200 border-[1.5px] border-navy hover:bg-navy hover:text-white"
            >
              Commencer gratuitement
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Section 7: Final CTA ─── */
function FinalCTASection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'var(--navy)',
        borderRadius: '24px 24px 0 0',
        marginTop: '2rem',
      }}
    >
      {/* Subtle animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background:
            'linear-gradient(135deg, rgba(248,90,62,0.05) 0%, rgba(11,29,58,0) 50%, rgba(248,90,62,0.03) 100%)',
          backgroundSize: '200% 200%',
          opacity: 0.05,
        }}
      />

      <div
        ref={ref}
        className="relative z-10 max-w-content mx-auto px-6 lg:px-12 py-4xl sm:py-[96px] text-center"
      >
        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="text-section-mobile sm:text-section-tablet lg:text-section text-white max-w-[600px] mx-auto mb-4"
        >
          Prêt à décrocher votre prochain entretien ?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15, ease: easeOutExpo }}
          className="text-body-large max-w-[600px] mx-auto mb-8"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          Créez votre compte gratuit en 30 secondes. Aucune carte bancaire
          requise.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3, ease: easeOutExpo }}
          className="flex flex-col items-center gap-4"
        >
          <Link
            to="/app"
            className="text-button text-white px-10 py-4 rounded-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--coral)',
              boxShadow: '0 4px 16px rgba(248,90,62,0.35)',
            }}
          >
            Adapter mon CV
          </Link>
          <Link
            to="/tarifs"
            className="text-body transition-all duration-200 hover:underline"
            style={{ color: 'var(--coral)' }}
          >
            Voir les tarifs détaillés
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Home Page ─── */
export default function Home() {
  const location = useLocation()

  /* scroll vers l'ancre (#tarifs, #comment-ca-marche) y compris en arrivant d'une autre page */
  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [location.hash])

  return (
    <div className="flex flex-col">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCTASection />
    </div>
  )
}
