"use client"

import type React from "react"
import { useState, useRef } from "react"
import { UploadIcon, Cross2Icon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

type PreviewFile = {
  file: File;
  preview: string;
  caption: string;
}

export function Upload() {
  const [isDragging, setIsDragging] = useState(false)
  const [previews, setPreviews] = useState<PreviewFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      handleFiles(files)
      // Reset the input value so the same file can be selected again
      e.target.value = ''
    }
  }

  const handleSelectClick = () => {
    fileInputRef.current?.click()
  }

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith("image/"))
    
    const newPreviews = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: ""
    }))

    setPreviews(prev => [...prev, ...newPreviews])
  }

  const updateCaption = (index: number, caption: string) => {
    setPreviews(prev => prev.map((p, i) => 
      i === index ? { ...p, caption } : p
    ))
  }

  const removePreview = (index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev]
      URL.revokeObjectURL(newPreviews[index].preview)
      newPreviews.splice(index, 1)
      return newPreviews
    })
  }

  const uploadToSupabase = async () => {
    if (previews.length === 0) return

    setIsUploading(true)
    try {
      for (const preview of previews) {
        // Upload file to Supabase Storage
        const fileExt = preview.file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('poland-photos')
          .upload(fileName, preview.file)

        if (uploadError) throw uploadError

        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('poland-photos')
          .getPublicUrl(fileName)

        // Store image metadata in the database
        const { error: dbError } = await supabase
          .from('images')
          .insert([
            {
              url: publicUrl,
              caption: preview.caption || "New uploaded image",
              created_at: new Date().toISOString(),
            },
          ])

        if (dbError) throw dbError

        // Notify the gallery component
        window.dispatchEvent(
          new CustomEvent("newImageUploaded", {
            detail: {
              id: fileName,
              url: publicUrl,
              caption: preview.caption || "New uploaded image",
            },
          })
        )
      }

      // Clear previews after successful upload
      previews.forEach(p => URL.revokeObjectURL(p.preview))
      setPreviews([])
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="mb-8 border-dashed dark:bg-slate-900/50">
      <CardContent className="p-6">
        {previews.length === 0 ? (
          <div 
            className={`flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-700"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadIcon className="w-12 h-12 mb-4 text-slate-400" />
            <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
              Upload Your Poland Holiday Photos
            </h2>
            <p className="mb-4 text-slate-500 dark:text-slate-400">
              Drag and drop your images here, or click to select files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              id="file-upload"
            />
            <Button variant="outline" onClick={handleSelectClick}>
              Select Images
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative">
                  <div className="relative aspect-[4/3]">
                    <img 
                      src={preview.preview} 
                      alt="Upload preview" 
                      className="object-cover w-full h-full rounded-lg" 
                    />
                    {!isUploading && (
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2" 
                        onClick={() => removePreview(index)}
                      >
                        <Cross2Icon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Add a caption (optional)"
                    className="w-full px-3 py-2 mt-2 bg-transparent border rounded-md dark:border-slate-700 dark:text-white"
                    value={preview.caption}
                    onChange={(e) => updateCaption(index, e.target.value)}
                    disabled={isUploading}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              {isUploading ? (
                <Button disabled>
                  <span className="mr-2">Uploading...</span>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setPreviews([])}>
                    Cancel All
                  </Button>
                  <Button onClick={uploadToSupabase}>
                    Upload {previews.length} {previews.length === 1 ? 'Image' : 'Images'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 