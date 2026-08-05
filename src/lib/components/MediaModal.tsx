import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

export interface MediaModalProps {
  isOpen: boolean
  title?: string
  src: string
  type: 'image' | 'html' | 'video'
  theme?: 'light' | 'dark' | 'custom'
  onClose: () => void
}

/**
 * MediaModal — Modal popup to view images, rendered HTML, or video media preview with links.
 */
export const MediaModal: React.FC<MediaModalProps> = ({
  isOpen,
  title = 'Media Viewer',
  src,
  type,
  theme = 'dark',
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isDark = theme === 'dark'

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: isDark ? 'rgba(5, 8, 20, 0.8)' : 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    padding: 16,
    animation: 'vgrid-fade-in 0.15s ease-out',
  }

  const dialogStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: type === 'html' ? 800 : 720,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: 12,
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    boxShadow: isDark
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.2)'
      : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }

  const headerStyle: React.CSSProperties = {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
    background: isDark ? '#131e32' : '#f8fafc',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: 0,
  }

  const badgeStyle: React.CSSProperties = {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 999,
    background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)',
    color: isDark ? '#818cf8' : '#4f46e5',
    fontWeight: 600,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  }

  const bodyStyle: React.CSSProperties = {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    overflowY: 'auto',
    minHeight: 200,
  }

  const footerStyle: React.CSSProperties = {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
    background: isDark ? '#131e32' : '#f8fafc',
  }

  return ReactDOM.createPortal(
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            <span>{title}</span>
            <span style={badgeStyle}>{type}</span>
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {type === 'image' && (
            <img
              src={src}
              alt={title}
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              }}
              onError={(e) => {
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
          )}

          {type === 'html' && (
            <div
              style={{
                width: '100%',
                maxHeight: '65vh',
                overflowY: 'auto',
                background: isDark ? '#090d16' : '#fafafa',
                padding: 16,
                borderRadius: 8,
                border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                color: isDark ? '#e2e8f0' : '#1e293b',
              }}
              dangerouslySetInnerHTML={{ __html: src }}
            />
          )}

          {type === 'video' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {src ? (
                <video
                  src={src}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '55vh',
                    borderRadius: 8,
                    background: '#000',
                  }}
                >
                  Your browser does not support HTML5 video.
                </video>
              ) : (
                <div style={{ color: isDark ? '#94a3b8' : '#64748b' }}>No video link provided</div>
              )}
              {src && (
                <div style={{ wordBreak: 'break-all', fontSize: 12, textAlign: 'center' }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Link: </span>
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: isDark ? '#818cf8' : '#4f46e5', textDecoration: 'underline' }}
                  >
                    {src}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
            Press Esc or click outside to close
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              background: isDark ? '#334155' : '#e2e8f0',
              border: 'none',
              color: isDark ? '#f8fafc' : '#0f172a',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
