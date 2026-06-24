import { useState, useEffect, useRef } from 'react'

interface DashboardOverlayProps {
  visible: boolean
}

export function DashboardOverlay({ visible }: DashboardOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    let mounted = true
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      console.log('[DashboardOverlay] Event caught:', customEvent.detail)
    }
    window.addEventListener('dashboard-event', handler)

    fetch('/templates/index.html')
      .then(res => res.text())
      .then(html => {
        if (!mounted || !containerRef.current) return
        
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        
        // Styles
        const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]'))
        styles.forEach(el => {
          if (el.tagName === 'STYLE') {
            let cssText = el.innerHTML
            cssText = cssText.replace(/body\s*\{/g, '.dashboard-native-container {')
            const style = document.createElement('style')
            style.className = 'dt-dashboard-injected'
            style.innerHTML = cssText
            document.head.appendChild(style)
          } else {
            const link = el.cloneNode() as HTMLLinkElement
            link.className = 'dt-dashboard-injected'
            document.head.appendChild(link)
          }
        })

        // HTML
        const bodyContent = doc.body.innerHTML
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = bodyContent
        Array.from(tempDiv.querySelectorAll('script')).forEach(s => s.remove())
        containerRef.current.innerHTML = tempDiv.innerHTML

        // Scripts
        const scripts = Array.from(doc.querySelectorAll('script'))
        scripts.forEach(s => {
          if (s.src) {
            const script = document.createElement('script')
            script.src = s.src
            script.className = 'dt-dashboard-injected'
            document.body.appendChild(script)
          } else {
            try {
              window.eval(s.innerHTML)
              
              if ((window as any).Dashboard?.init) {
                (window as any).Dashboard.init()
              }
              if ((window as any).DashboardAdmin?.init) {
                (window as any).DashboardAdmin.init()
              }
            } catch (err) {
              console.error('Error executing dashboard script:', err)
            }
          }
        })
      })

    return () => {
      mounted = false
      window.removeEventListener('dashboard-event', handler)
      document.querySelectorAll('.dt-dashboard-injected').forEach(el => el.remove())
      if ((window as any).Dashboard?.finInterval) {
        clearInterval((window as any).Dashboard.finInterval)
      }
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="dashboard-overlay-container">
      <div 
        ref={containerRef} 
        className="dashboard-native-container" 
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
