export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  /** Identificador opcional para agrupar por usuario (ej. uid de Firebase) */
  tags?: string[];
}
