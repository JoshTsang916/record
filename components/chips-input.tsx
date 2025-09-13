"use client"
import { useState } from 'react'

export default function ChipsInput({ value, onChange, placeholder }: { value: string[], onChange: (v: string[]) => void, placeholder?: string }) {
  const [input, setInput] = useState('')

  function addChipFromInput() {
    const parts = input.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    const set = new Set(value)
    parts.forEach(p => set.add(p))
    onChange(Array.from(set))
    setInput('')
  }

  function removeChip(t: string) {
    onChange(value.filter(v => v !== t))
  }

  return (
    <div className="min-h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 flex flex-wrap gap-2 items-center">
      {value.map(t => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs px-2 py-1">
          {t}
          <button type="button" onClick={() => removeChip(t)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChipFromInput() }
          if (e.key === 'Backspace' && !input && value.length) {
            removeChip(value[value.length - 1])
          }
        }}
        onBlur={addChipFromInput}
        placeholder={placeholder || '新增標籤，Enter/逗號確定'}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  )
}

