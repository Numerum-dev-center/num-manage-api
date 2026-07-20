import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

// Stocké en dehors de `public/` (servi sans authentification par main.ts) :
// le téléchargement passe uniquement par la route contrôlée du contrôleur.
export const RESSOURCES_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'ressources',
);

export const MAX_RESSOURCE_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

const ALLOWED_EXTENSIONS = ['.pdf', '.zip'];

export function ressourceFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    callback(
      new BadRequestException('Seuls les fichiers PDF et ZIP sont autorisés'),
      false,
    );
    return;
  }
  callback(null, true);
}

export const ressourcesMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdirSync(RESSOURCES_UPLOAD_DIR, { recursive: true });
      callback(null, RESSOURCES_UPLOAD_DIR);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  fileFilter: ressourceFileFilter,
  limits: { fileSize: MAX_RESSOURCE_FILE_SIZE },
};
