import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'

export interface JsonModalProps {
  isOpen: boolean
  title?: string
  value: unknown
  readOnly?: boolean
  theme?: 'light' | 'dark' | 'custom'
  onSave?: (newValue: unknown) => void
  onClose: () => void
}

/**
 * JsonModal — A modal dialog for viewing, prettifying, copy-pasting, and editing JSON data.
 */
export const JsonModal: React.FC<JsonModalProps> = ({
  isOpen,
  title = 'JSON Viewer',
  value,
  readOnly = false,
  theme = 'dark',
  onSave,
  onClose,
}) => {
  const [jsonString, setJsonString] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Synchronize incoming value when modal opens
  useEffect(() => {
    if (isOpen) {
      let formatted = ''
      try {
        if (typeof value === 'string') {
          // Attempt to parse string as JSON to pretty-print, or keep string
          const parsed = JSON.parse(value)
          formatted = JSON.stringify(parsed, null, 2)
        } else if (value != null) {
          formatted = JSON.stringify(value, null, 2)
        } else {
          formatted = 'null'
        }
        setError(null)
      } catch (err) {
        formatted = String(value ?? '')
        setError('Notice: Initial value is not valid JSON string.')
      }
      setJsonString(formatted)
      setIsCopied(false)
    }
  }, [isOpen, value])

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && e.ctrlKey && !readOnly && onSave) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, jsonString, readOnly, onSave, onClose])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setJsonString(val)
    if (!val.trim()) {
      setError(null)
      return
    }
    try {
      JSON.parse(val)
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Invalid JSON syntax')
    }
  }

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(jsonString)
      setJsonString(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch (err: any) {
      setError('Cannot format: ' + (err?.message || 'Invalid JSON'))
    }
  }

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(jsonString)
      setJsonString(JSON.stringify(parsed))
      setError(null)
    } catch (err: any) {
      setError('Cannot minify: ' + (err?.message || 'Invalid JSON'))
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy to clipboard', e)
    }
  }

  const handleSave = () => {
    if (!onSave || readOnly) return
    if (!jsonString.trim()) {
      onSave(null)
      onClose()
      return
    }
    try {
      const parsed = JSON.parse(jsonString)
      onSave(parsed)
      onClose()
    } catch (err: any) {
      setError('Cannot save invalid JSON: ' + (err?.message || 'Syntax error'))
    }
  }

  if (!isOpen) return null

  const isDark = theme === 'dark'
  const isLight = theme === 'light'

  // Styling inline tokens for clean portal overlay
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: isDark ? 'rgba(5, 8, 20, 0.75)' : 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    padding: 16,
    animation: 'vgrid-fade-in 0.15s ease-out',
  }

  const dialogStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 680,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: 12,
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    boxShadow: isDark
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.2)'
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
  }

  const bodyStyle: React.CSSProperties = {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
    overflowY: 'auto',
  }

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  }

  const btnGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }

  const actionBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
    background: isDark ? '#1e293b' : '#f1f5f9',
    color: isDark ? '#cbd5e1' : '#334155',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s ease',
  }

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 260,
    maxHeight: 450,
    fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.5,
    padding: 14,
    borderRadius: 8,
    border: `1px solid ${error ? '#ef4444' : isDark ? '#334155' : '#cbd5e1'}`,
    backgroundColor: isDark ? '#090d16' : '#fafafa',
    color: isDark ? '#e2e8f0' : '#1e293b',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    tabSize: 2,
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
            <span style={badgeStyle}>JSON</span>
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
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <div style={btnGroupStyle}>
              <button style={actionBtnStyle} onClick={handlePrettify} title="Prettify JSON with 2-space indentation">
                <span>✨ Format</span>
              </button>
              <button style={actionBtnStyle} onClick={handleMinify} title="Minify JSON string">
                <span>📦 Minify</span>
              </button>
            </div>
            <div style={btnGroupStyle}>
              <button
                style={{
                  ...actionBtnStyle,
                  background: isCopied ? '#10b98120' : actionBtnStyle.background,
                  borderColor: isCopied ? '#10b981' : actionBtnStyle.borderColor,
                  color: isCopied ? '#10b981' : actionBtnStyle.color,
                }}
                onClick={handleCopy}
              >
                <span>{isCopied ? '✓ Copied!' : '📋 Copy JSON'}</span>
              </button>
            </div>
          </div>

          {/* Text Area Editor */}
          <textarea
            ref={textareaRef}
            style={textareaStyle}
            value={jsonString}
            onChange={handleTextChange}
            readOnly={readOnly}
            placeholder="Paste or enter JSON here..."
            spellCheck={false}
          />

          {/* Error Banner */}
          {error && (
            <div
              style={{
                fontSize: 12,
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: isDark ? '#450a0a' : '#fef2f2',
                color: isDark ? '#fca5a5' : '#dc2626',
                border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
            {!readOnly && onSave ? 'Ctrl + Enter to save · Esc to close' : 'Esc to close'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                background: 'transparent',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                color: isDark ? '#cbd5e1' : '#475569',
                cursor: 'pointer',
              }}
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && onSave && (
              <button
                onClick={handleSave}
                disabled={!!error}
                style={{
                  padding: '6px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: error ? '#64748b' : '#4f46e5',
                  border: 'none',
                  color: '#ffffff',
                  cursor: error ? 'not-allowed' : 'pointer',
                  boxShadow: error ? 'none' : '0 2px 4px rgba(79, 70, 229, 0.3)',
                }}
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
