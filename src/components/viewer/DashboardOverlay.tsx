import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import type { ProjectApiSettings } from '@/types'

interface DashboardOverlayProps {
  visible: boolean
}

export function DashboardOverlay({ visible }: DashboardOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentProject = useProjectStore(s => s.currentProject)

  useEffect(() => {
    if (!visible) return
    let mounted = true
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      console.log('[DashboardOverlay] Event caught:', customEvent.detail)
    }
    window.addEventListener('dashboard-event', handler)

    fetch('templates/index.html')
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

        // Inject project API settings BEFORE running template scripts
        const apiSettings: ProjectApiSettings = currentProject?.apiSettings || {}
        const configScript = `
          window.INJECTED_PROJECT_CONFIG = {
            fin: {
              baseUrl: "${apiSettings.finBaseUrl || 'https://localhost'}",
              project: "${apiSettings.finProjectName || 'EllisDonDemo'}",
              interval: ${apiSettings.finInterval || 5000},
              directMode: ${apiSettings.finDirectMode || false},
              livePoints: ${apiSettings.finLivePoints ? JSON.stringify(apiSettings.finLivePoints) : 'undefined'},
              endpoints: ${apiSettings.finEndpoints ? JSON.stringify(apiSettings.finEndpoints) : 'undefined'}
            },
            weather: {
              lat: ${apiSettings.weatherLat ?? 24.469},
              lon: ${apiSettings.weatherLon ?? 54.358},
              apiKey: "${apiSettings.weatherApiKey || '88214bff7aa566e9f6ff1ba5db38f65f'}"
            },
            navButtons: ${apiSettings.navButtons ? JSON.stringify(apiSettings.navButtons) : 'undefined'},
            leftCards: ${apiSettings.leftCards ? JSON.stringify(apiSettings.leftCards) : 'undefined'},
            rightCards: ${apiSettings.rightCards ? JSON.stringify(apiSettings.rightCards) : 'undefined'},
            sideButtons: ${apiSettings.sideButtons ? JSON.stringify(apiSettings.sideButtons.filter(b => b.enabled !== false)) : 'undefined'},
            subPanels: ${apiSettings.subPanels ? JSON.stringify(apiSettings.subPanels) : 'undefined'},
            modelsConfig: ${apiSettings.modelsConfig ? JSON.stringify(apiSettings.modelsConfig) : 'undefined'},
            floorsConfig: ${apiSettings.floorsConfig ? JSON.stringify(apiSettings.floorsConfig) : 'undefined'}
          };
        `
        try {
          window.eval(configScript)
        } catch (err) {
          console.error('Error injecting project config:', err)
        }

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
      // Clean up injected config
      delete (window as any).INJECTED_PROJECT_CONFIG
    }
  }, [visible, currentProject?.apiSettings])

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
