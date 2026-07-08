import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { buildJsonLd, canonicalFor, getSeoPage, siteUrl } from '../lib/seo'

function upsertMeta(selector: string, create: () => HTMLMetaElement, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = create()
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function upsertJsonLd(value: unknown) {
  let element = document.head.querySelector<HTMLScriptElement>('#cvfit-jsonld')
  if (!element) {
    element = document.createElement('script')
    element.id = 'cvfit-jsonld'
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(value)
}

export default function Seo() {
  const location = useLocation()

  useEffect(() => {
    const page = getSeoPage(location.pathname)
    const canonical = canonicalFor(page.path)

    document.documentElement.lang = 'fr'
    document.title = page.title
    upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'description'
      return meta
    }, page.description)
    upsertMeta('meta[name="robots"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'robots'
      return meta
    }, page.robots ?? 'index, follow')
    upsertMeta('meta[property="og:title"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:title')
      return meta
    }, page.title)
    upsertMeta('meta[property="og:description"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:description')
      return meta
    }, page.description)
    upsertMeta('meta[property="og:url"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:url')
      return meta
    }, canonical)
    upsertMeta('meta[name="twitter:title"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:title'
      return meta
    }, page.title)
    upsertMeta('meta[name="twitter:description"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:description'
      return meta
    }, page.description)
    upsertMeta('meta[name="twitter:image"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:image'
      return meta
    }, `${siteUrl}/og-image.jpg`)
    upsertCanonical(canonical)
    upsertJsonLd(buildJsonLd(page))
  }, [location.pathname])

  return null
}
