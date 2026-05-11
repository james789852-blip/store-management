'use client'

import { useRef, useState, DragEvent } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  folderPath: string
  value: string[]
  onChange: (urls: string[]) => void
  multiple?: boolean
  accept?: string
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url)
}

function fileName(url: string) {
  const raw = url.split('/').pop() || url
  // Strip timestamp_rand prefix (format: 1234567890_abc123.ext)
  return raw.replace(/^\d+_[a-z0-9]+\./, '') || raw
}

export default function FileUploader({
  folderPath,
  value,
  onChange,
  multiple = true,
  accept,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    const toUpload = multiple ? files : [files[0]]
    setUploading(true)

    const urls = multiple ? [...value] : []

    for (const file of toUpload) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const ts = Date.now()
      const rand = Math.random().toString(36).slice(2, 8)
      const path = `${folderPath}/${ts}_${rand}.${ext}`

      const { error } = await supabase.storage
        .from('store-files')
        .upload(path, file, { upsert: true })

      if (!error) {
        const { data } = supabase.storage.from('store-files').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }

    onChange(urls)
    setUploading(false)
  }

  function remove(url: string) {
    onChange(value.filter(u => u !== url))
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  const showZone = multiple || value.length === 0

  return (
    <div>
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map(url => (
            <div key={url} className="relative group">
              {isImage(url) ? (
                <img
                  src={url}
                  alt=""
                  onClick={() => setLightbox(url)}
                  className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <svg className="w-7 h-7 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs truncate w-16 text-center text-gray-400">{fileName(url)}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500 active:bg-red-500 transition-all leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {showZone && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer select-none transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 py-1 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              上傳中...
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-1">
              拖曳{multiple ? '檔案' : '檔案（限 1 個）'}至此，或{' '}
              <span className="text-blue-600 font-medium">點擊上傳</span>
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={accept}
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files || [])
              if (files.length) uploadFiles(files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-xl w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
          <a
            href={lightbox}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute bottom-4 right-4 text-white text-xs bg-black/50 hover:bg-black/70 px-3 py-1.5 rounded-full transition-colors"
          >
            開啟原圖
          </a>
        </div>
      )}
    </div>
  )
}
