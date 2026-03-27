declare module 'piexifjs' {
  interface Piexif {
    remove(jpeg: string): string
    insert(exif: string, jpeg: string): string
    dump(exifDict: unknown): string
    load(data: string): unknown
    version: string
    ImageIFD: Record<string, number>
    ExifIFD: Record<string, number>
    GPSIFD: Record<string, number>
  }
  const piexif: Piexif
  export default piexif
}
