import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

// Contrairement aux ressources pédagogiques, l'avatar doit être affichable
// directement via <img src> sans passer par une route authentifiée : il vit
// donc sous `public/`, servi statiquement par `useStaticAssets` (main.ts).
export const AVATARS_UPLOAD_DIR = join(process.cwd(), 'public', 'avatars');

export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export function avatarFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    callback(
      new BadRequestException(
        'Seules les images (JPG, PNG, WEBP, GIF) sont autorisées',
      ),
      false,
    );
    return;
  }
  callback(null, true);
}

export const avatarMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdirSync(AVATARS_UPLOAD_DIR, { recursive: true });
      callback(null, AVATARS_UPLOAD_DIR);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  fileFilter: avatarFileFilter,
  limits: { fileSize: MAX_AVATAR_FILE_SIZE },
};
