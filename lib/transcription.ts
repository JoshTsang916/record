export async function transcribeIfNeeded(file: File | Blob, want: boolean): Promise<{ text: string, model: string, confidence: number }>
{
  if (!want) return { text: '', model: '', confidence: 0 }
  const key = process.env.OPENAI_API_KEY
  if (!key) return { text: '', model: '', confidence: 0 }

  try {
    const form = new FormData()
    const f = file instanceof File ? file : new File([file], 'audio.webm', { type: 'audio/webm' })
    form.append('file', f)
    form.append('model', 'whisper-1')
    form.append('response_format', 'verbose_json')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`
      },
      body: form
    })
    if (!res.ok) throw new Error(`Whisper error: ${res.status}`)
    const json = await res.json()
    const text = json.text || ''
    const confidence = typeof json.confidence === 'number' ? json.confidence : 0
    return { text, model: 'whisper-1', confidence }
  } catch (e) {
    return { text: '', model: '', confidence: 0 }
  }
}

