"use client"

import type React from "react"
import { useState } from "react"
import { UploadIcon, Cross2Icon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export function Upload() {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [caption, setCaption] = useState("")
  const [currentFile, setCurrentFile] = useState<File | null>(null)

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith("image/")) {
        setCurrentFile(file)
        previewFile(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith("image/")) {
        setCurrentFile(file)
        previewFile(file)
      }
    }
  }

  const previewFile = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadToSupabase = async () => {
    if (!currentFile) return

    setIsUploading(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = currentFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('poland-photos')
        .upload(fileName, currentFile)

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
            caption: caption || "New uploaded image",
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
            caption: caption || "New uploaded image",
          },
        })
      )

      setPreview(null)
      setCaption("")
      setCurrentFile(null)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const cancelUpload = () => {
    setPreview(null)
    setIsUploading(false)
    setCaption("")
    setCurrentFile(null)
  }

  return (
    <Card className="mb-8 border-dashed dark:bg-slate-900/50">
      <CardContent className="p-6">
        {!preview ? (
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
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Images
                <input id="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
              </label>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg aspect-video">
              <img src={preview} alt="Upload preview" className="object-cover w-full h-full" />
              {!isUploading && (
                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={cancelUpload}>
                  <Cross2Icon className="w-4 h-4" />
                </Button>
              )}
            </div>
            <input
              type="text"
              placeholder="Add a caption (optional)"
              className="w-full px-3 py-2 bg-transparent border rounded-md dark:border-slate-700 dark:text-white"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isUploading}
            />
            <div className="flex justify-end space-x-2">
              {isUploading ? (
                <Button disabled>
                  <span className="mr-2">Uploading...</span>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={cancelUpload}>
                    Cancel
                  </Button>
                  <Button onClick={uploadToSupabase}>Upload</Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 