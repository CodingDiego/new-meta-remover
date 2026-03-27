declare module 'piexifjs' {
  interface Piexif {
    remove(jpeg: string): string
    insert(exif: string, jpeg: string): string
    dump(exifDict: unknown): string
    load(data: string): unknown
    version: string
  }
  const piexif: Piexif
  export default piexif
}
