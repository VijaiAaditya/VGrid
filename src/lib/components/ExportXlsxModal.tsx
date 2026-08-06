import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface ExportXlsxModalProps {
  isOpen: boolean
  theme?: 'light' | 'dark'
  filteredCount: number
  totalCount: number
  defaultFileName?: string
  onConfirm: (mode: 'all' | 'filtered', fileName: string) => void
  onClose: () => void
}

function getTimestampedFileName(originalName: string = 'v-grid-export.xlsx'): string {
  const extIndex = originalName.lastIndexOf('.')
  const base = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName
  const ext = extIndex !== -1 ? originalName.slice(extIndex) : '.xlsx'

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${base}_${year}${month}${date}_${hours}${minutes}${ext}`
}

export const ExportXlsxModal: React.FC<ExportXlsxModalProps> = ({
  isOpen,
  theme = 'dark',
  filteredCount,
  totalCount,
  defaultFileName,
  onConfirm,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<'all' | 'filtered'>('filtered')
  const [hoveredMode, setHoveredMode] = useState<'all' | 'filtered' | null>(null)
  const [cancelHovered, setCancelHovered] = useState(false)
  const [exportHovered, setExportHovered] = useState(false)
  const [fileName, setFileName] = useState(() => getTimestampedFileName(defaultFileName))

  const handleConfirm = () => {
    let finalName = fileName.trim()
    if (!finalName) {
      finalName = getTimestampedFileName(defaultFileName)
    }
    if (!finalName.toLowerCase().endsWith('.xlsx')) {
      finalName += '.xlsx'
    }
    onConfirm(selectedMode, finalName)
  }

  // Escape and Enter key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedMode, fileName, onClose, onConfirm])

  if (!isOpen) return null

  const isDark = theme === 'dark'

  // Styling
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: isDark ? 'rgba(5, 8, 20, 0.75)' : 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    padding: 16,
  }

  const dialogStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 500,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: 16,
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    boxShadow: isDark
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.15)'
      : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }

  const headerStyle: React.CSSProperties = {
    padding: '24px 24px 16px',
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
    background: isDark ? '#131e32' : '#f8fafc',
  }

  const iconContainerStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #10b981, #059669)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.01em',
  }

  const subtitleStyle: React.CSSProperties = {
    fontSize: 12,
    color: isDark ? '#94a3b8' : '#64748b',
    marginTop: 4,
    lineHeight: 1.4,
  }

  const bodyStyle: React.CSSProperties = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  }

  const cardStyle = (mode: 'all' | 'filtered'): React.CSSProperties => {
    const isSelected = selectedMode === mode
    const isHovered = hoveredMode === mode

    let border = `2px solid ${isDark ? '#1e293b' : '#cbd5e1'}`
    if (isSelected) {
      border = '2px solid #10b981'
    } else if (isHovered) {
      border = `2px solid ${isDark ? '#475569' : '#94a3b8'}`
    }

    let bg = isDark ? '#141e33' : '#ffffff'
    if (isSelected) {
      bg = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)'
    } else if (isHovered) {
      bg = isDark ? '#1e293b' : '#f8fafc'
    }

    return {
      position: 'relative',
      cursor: 'pointer',
      padding: 16,
      borderRadius: 12,
      border,
      backgroundColor: bg,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      boxShadow: isSelected
        ? '0 0 16px rgba(16, 185, 129, 0.15)'
        : (isHovered ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none'),
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      userSelect: 'none',
    }
  }

  const footerStyle: React.CSSProperties = {
    padding: '16px 24px 24px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    borderTop: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
    backgroundColor: isDark ? '#0b1120' : '#f8fafc',
  }

  const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
    background: cancelHovered ? (isDark ? '#1e293b' : '#f1f5f9') : 'transparent',
    color: isDark ? '#cbd5e1' : '#475569',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }

  const exportBtnStyle: React.CSSProperties = {
    padding: '8px 24px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    borderRadius: 8,
    cursor: 'pointer',
    boxShadow: exportHovered ? '0 6px 16px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.3)',
    transform: exportHovered ? 'translateY(-1px)' : 'none',
    transition: 'all 0.15s ease',
  }

  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div style={headerStyle}>
          <div style={iconContainerStyle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={titleStyle}>Export to Excel</h2>
            <div style={subtitleStyle}>Select the range of data to export to your XLSX file.</div>
          </div>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <div style={gridStyle}>
            {/* Filtered Data Card */}
            <div
              style={cardStyle('filtered')}
              onMouseEnter={() => setHoveredMode('filtered')}
              onMouseLeave={() => setHoveredMode(null)}
              onClick={() => setSelectedMode('filtered')}
              onDoubleClick={handleConfirm}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selectedMode === 'filtered' ? '#10b981' : (isDark ? '#94a3b8' : '#64748b')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `1.5px solid ${selectedMode === 'filtered' ? '#10b981' : (isDark ? '#475569' : '#cbd5e1')}`,
                  background: selectedMode === 'filtered' ? '#10b981' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s'
                }}>
                  {selectedMode === 'filtered' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: selectedMode === 'filtered' ? '#10b981' : 'inherit' }}>
                Filtered Data
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', lineHeight: 1.3, flexGrow: 1 }}>
                Exports rows matching active filters, search, and grouping options.
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: selectedMode === 'filtered' ? '#10b981' : 'inherit', marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {filteredCount.toLocaleString()}
                <span style={{ fontSize: 9, fontWeight: 500, color: isDark ? '#64748b' : '#94a3b8' }}>rows</span>
              </div>
            </div>

            {/* Full Data Card */}
            <div
              style={cardStyle('all')}
              onMouseEnter={() => setHoveredMode('all')}
              onMouseLeave={() => setHoveredMode(null)}
              onClick={() => setSelectedMode('all')}
              onDoubleClick={handleConfirm}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selectedMode === 'all' ? '#10b981' : (isDark ? '#94a3b8' : '#64748b')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `1.5px solid ${selectedMode === 'all' ? '#10b981' : (isDark ? '#475569' : '#cbd5e1')}`,
                  background: selectedMode === 'all' ? '#10b981' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s'
                }}>
                  {selectedMode === 'all' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: selectedMode === 'all' ? '#10b981' : 'inherit' }}>
                Full Data
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', lineHeight: 1.3, flexGrow: 1 }}>
                Exports all records in the grid, ignoring active search or filter rules.
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: selectedMode === 'all' ? '#10b981' : 'inherit', marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {totalCount.toLocaleString()}
                <span style={{ fontSize: 9, fontWeight: 500, color: isDark ? '#64748b' : '#94a3b8' }}>rows</span>
              </div>
            </div>
          </div>

          {/* Warning banner for 0 rows */}
          {selectedMode === 'filtered' && filteredCount === 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
              border: `1px solid ${isDark ? '#7f1d1d' : '#fee2e2'}`,
              color: isDark ? '#f87171' : '#ef4444',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
            }}>
              <span>⚠️</span>
              <span>Notice: No rows match filters. Export will only contain headers.</span>
            </div>
          )}

          {/* File Name Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
              File Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{
                position: 'absolute', left: 12, display: 'flex', alignItems: 'center',
                color: isDark ? '#64748b' : '#94a3b8', pointerEvents: 'none'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </span>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="v-grid-export.xlsx"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  borderRadius: 8,
                  outline: 'none',
                  transition: 'all 0.15s ease-out',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981'
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2), inset 0 1px 2px rgba(0,0,0,0.05)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#334155' : '#cbd5e1'
                  e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            style={cancelBtnStyle}
            onMouseEnter={() => setCancelHovered(true)}
            onMouseLeave={() => setCancelHovered(false)}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={exportBtnStyle}
            onMouseEnter={() => setExportHovered(true)}
            onMouseLeave={() => setExportHovered(false)}
            onClick={handleConfirm}
          >
            Export to Excel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
